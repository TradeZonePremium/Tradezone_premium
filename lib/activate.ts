import { supabaseAdmin } from "./supabase-server";
import { addMonths, maxDate, todayIST } from "./dates";
import { PLANS, isPlanId } from "./plans";
import { sendPaymentSuccessEmail } from "./email";

export type ActivateResult =
  | { ok: true; alreadyProcessed: boolean }
  | { ok: false; error: string };

/**
 * Marks a payment as paid and activates / extends the subscription.
 *
 * IDEMPOTENT: called from BOTH /api/orders/verify and the Razorpay webhook.
 * Whichever runs first "claims" the payment (status CREATED -> PAID in one
 * atomic UPDATE). The second one finds nothing to claim and does nothing,
 * so a payment can never extend the subscription twice.
 *
 * Call this ONLY after you verified the Razorpay signature.
 */
export async function activatePayment(orderId: string, paymentId: string): Promise<ActivateResult> {
  const db = supabaseAdmin();

  // 1) Claim the payment atomically.
  const { data: claimed, error: claimErr } = await db
    .from("payments")
    .update({ status: "PAID", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() })
    .eq("razorpay_order_id", orderId)
    .eq("status", "CREATED")
    .select()
    .maybeSingle();

  if (claimErr) return { ok: false, error: claimErr.message };

  if (!claimed) {
    // Either already processed, or this order is not ours.
    const { data: existing } = await db
      .from("payments")
      .select("status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();
    if (existing?.status === "PAID") return { ok: true, alreadyProcessed: true };
    return { ok: false, error: "Unknown order" };
  }

  // 2) Load the subscription and work out the new dates.
  const revert = async () => {
    await db
      .from("payments")
      .update({ status: "CREATED", razorpay_payment_id: null, paid_at: null })
      .eq("razorpay_order_id", orderId);
  };

  const { data: sub, error: subErr } = await db
    .from("subscriptions")
    .select("*")
    .eq("id", claimed.subscription_id)
    .single();

  const planId: unknown = claimed.plan;
  if (subErr || !sub || !isPlanId(planId)) {
    await revert();
    return { ok: false, error: subErr?.message || "Subscription or plan not found" };
  }

  const today = todayIST();
  // Still active -> new period starts when the old one ends (no lost days).
  // Never subscribed / already expired -> starts today.
  const stillActive = sub.status === "ACTIVE" && sub.expiry_date && sub.expiry_date >= today;
  const startDate = stillActive ? maxDate(sub.expiry_date, today) : today;
  const expiryDate = addMonths(startDate, PLANS[planId].months);

  // 3) Update the subscription.
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
      reminder_sent: false,
      expired_email_sent: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  if (updErr) {
    await revert(); // so the webhook / a retry can try again
    return { ok: false, error: updErr.message };
  }

  // 4) Confirmation email (a failed email must not undo a successful payment).
  await sendPaymentSuccessEmail({
    to: sub.email,
    name: sub.name,
    plan: claimed.plan,
    amount: claimed.amount,
    startDate,
    expiryDate,
    joinToken: sub.join_token,
  });

  return { ok: true, alreadyProcessed: false };
}
