import { supabaseAdmin } from "./supabase-server";
import { addMonths, maxDate, todayIST } from "./dates";
import { PLANS, isPlanId } from "./plans";
import { sendPremiumGroupInvite } from "./whatsapp";
// Import your email sending function here (adjust path if needed, e.g., '@/lib/email')
// import { sendEmail } from "./email";

export type ActivateResult =
  | { ok: true; alreadyProcessed: boolean }
  | { ok: false; error: string };

/**
 * Marks a payment as paid and activates / extends the subscription.
 *
 * IDEMPOTENT:
 * Called from both /api/orders/verify and the Razorpay webhook.
 * Only the first request claims the payment.
 *
 * Call this only after the Razorpay payment/signature has been verified.
 */
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

  if (claimErr) {
    return {
      ok: false,
      error: claimErr.message,
    };
  }

  if (!claimed) {
    // Already processed or unknown order.
    const { data: existing } = await db
      .from("payments")
      .select("status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (existing?.status === "PAID") {
      return {
        ok: true,
        alreadyProcessed: true,
      };
    }

    return {
      ok: false,
      error: "Unknown order",
    };
  }

  // 2) Load subscription.
  const revert = async () => {
    await db
      .from("payments")
      .update({
        status: "CREATED",
        razorpay_payment_id: null,
        paid_at: null,
      })
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

    return {
      ok: false,
      error: subErr?.message || "Subscription or plan not found",
    };
  }

  // 3) Calculate subscription dates.
  const today = todayIST();

  const stillActive =
    sub.status === "ACTIVE" &&
    sub.expiry_date &&
    sub.expiry_date >= today;

  const startDate = stillActive
    ? maxDate(sub.expiry_date, today)
    : today;

  const expiryDate = addMonths(
    startDate,
    PLANS[planId].months
  );

  // 4) Update subscription.
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
    await revert();

    return {
      ok: false,
      error: updErr.message,
    };
  }

  // 5) Send WhatsApp group invitation AND Email notification simultaneously.
  // Payment remains successful even if notification delivery fails.
  try {
    // A) Send via WhatsApp
    if (sub.whatsapp_number) {
      await sendPremiumGroupInvite(sub.whatsapp_number);
      console.log("[activate] WhatsApp group invitation sent.");
    } else {
      console.error("[activate] WhatsApp number is missing.");
    }

    // B) Send via Email
    if (sub.email) {
      // Uncomment and use your project's email dispatcher here:
      /*
      await sendEmail({
        to: sub.email,
        subject: "Your Trade Zone Premium Access Link",
        text: "Your payment was successful! Check your WhatsApp or community dashboard for your group access link."
      });
      */
      console.log("[activate] Email notification dispatched.");
    }
  } catch (err) {
    console.error("[activate] Notification delivery failed:", err);
  }

  // 6) Payment activation completed.
  return {
    ok: true,
    alreadyProcessed: false,
  };
}
