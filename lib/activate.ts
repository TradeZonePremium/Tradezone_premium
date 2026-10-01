import { supabaseAdmin } from "./supabase-server";
import { addMonths, maxDate, todayIST } from "./dates";
import { PLANS, isPlanId } from "./plans";
import { sendPaymentSuccessEmail } from "./email"; 
import { randomUUID } from "crypto";

// import { sendPremiumGroupInvite } from "./whatsapp"; // Commented out WhatsApp API

export type ActivateResult =
  | { ok: true; alreadyProcessed: boolean }
  | { ok: false; error: string };

export async function activatePayment(
  orderId: string,
  paymentId: string
): Promise<ActivateResult> {
  const db = supabaseAdmin();

  // 1) Claim the payment atomically.
  const { data: claimed, error: claimErr } = await db
    .from("payments")
    .update({
      status: "PAID",
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", orderId)
    .eq("status", "CREATED")
    .select()
    .maybeSingle();

  if (claimErr) return { ok: false, error: claimErr.message };

  if (!claimed) {
    const { data: existing } = await db.from("payments").select("status").eq("razorpay_order_id", orderId).maybeSingle();
    if (existing?.status === "PAID") return { ok: true, alreadyProcessed: true };
    return { ok: false, error: "Unknown order" };
  }

  // 2) Load subscription.
  const revert = async () => {
    await db.from("payments").update({ status: "CREATED", razorpay_payment_id: null, paid_at: null }).eq("razorpay_order_id", orderId);
  };

  const { data: sub, error: subErr } = await db.from("subscriptions").select("*").eq("id", claimed.subscription_id).single();
  const planId: unknown = claimed.plan;

  if (subErr || !sub || !isPlanId(planId)) {
    await revert();
    return { ok: false, error: subErr?.message || "Subscription or plan not found" };
  }

  // 3) Calculate subscription dates.
  const today = todayIST();
  const stillActive = sub.status === "ACTIVE" && sub.expiry_date && sub.expiry_date >= today;
  const startDate = stillActive ? maxDate(sub.expiry_date, today) : today;
  const expiryDate = addMonths(startDate, PLANS[planId].months);

  // 4) Update subscription and generate one-time join token
  const joinToken = randomUUID(); // Create secure token for masked route
  const { error: updErr } = await db
    .from("subscriptions")
    .update({
      plan: claimed.plan,
      amount: claimed.amount,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      start_date: startDate,
      expiry_date: expiryDate,
      status: "ACTIVE",
      join_token: joinToken, // Ensure your database has this column
      reminder_sent: false,
      expired_email_sent: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  if (updErr) {
    await revert();
    return { ok: false, error: updErr.message };
  }

  // 5) Email-Only Delivery with Masked Link
  try {
    /* WHATSAPP DIRECT MESSAGE COMMENTED OUT
    if (sub.whatsapp_number) {
      await sendPremiumGroupInvite(sub.whatsapp_number, inviteLink);
    } 
    */

    if (sub.email) {
      await sendPaymentSuccessEmail({
        to: sub.email,
        name: sub.name || "Customer",
        plan: claimed.plan as string,
        amount: claimed.amount,
        startDate: startDate,
        expiryDate: expiryDate,
        joinToken: joinToken, // The token is appended to the masked route in lib/email.ts
      });
      console.log("[activate] Email success notification dispatched with masked link.");
    }
  } catch (err) {
    console.error("[activate] Notification delivery failed:", err);
  }

  return { ok: true, alreadyProcessed: false };
}
