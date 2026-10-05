import { supabaseAdmin } from "./supabase-server";
import { addMonths, maxDate, todayIST } from "./dates";
import { PLANS, isPlanId } from "./plans";
import { sendPaymentSuccessEmail } from "./email";
import { randomUUID } from "crypto";
import { createMemberInvite, restoreTelegramMember, sendTelegramMessage } from "./telegram";

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

  if (claimErr) {
    console.error("[activate] Payment claim failed:", claimErr);

    return {
      ok: false,
      error: claimErr.message,
    };
  }

  if (!claimed) {
    const { data: existing } = await db
      .from("payments")
      .select("status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (existing?.status === "PAID") {
      console.log(
        "[activate] Payment was already processed:",
        orderId
      );

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

    console.error(
      "[activate] Subscription/plan error:",
      subErr?.message || "Subscription or plan not found"
    );

    return {
      ok: false,
      error:
        subErr?.message ||
        "Subscription or plan not found",
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

  // 4) Generate secure Telegram connection token.
  const joinToken = randomUUID();

  console.log(
    "[activate] Generated Telegram join token for subscription:",
    sub.id
  );

  // 5) Activate subscription.
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
      join_token: joinToken,
      reminder_sent: false,
      expired_email_sent: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  if (updErr) {
    await revert();

    console.error(
      "[activate] Subscription activation failed:",
      updErr
    );

    return {
      ok: false,
      error: updErr.message,
    };
  }

  console.log(
    "[activate] Subscription activated:",
    {
      subscriptionId: sub.id,
      plan: claimed.plan,
      amount: claimed.amount,
      startDate,
      expiryDate,
    }
  );

  // 6) Restore Telegram access for a previously linked member.
  // If this is a renewal after expiry, unban the user before giving them a fresh invite.
  if (sub.telegram_user_id) {
    const telegramUserId = Number(sub.telegram_user_id);
    await restoreTelegramMember(telegramUserId);

    try {
      const inviteLink = await createMemberInvite();
      await sendTelegramMessage(
        telegramUserId,
        `✅ Your Trade Zone Premium subscription is active again!\n\n` +
          `Valid until: ${expiryDate}\n\n` +
          `Join the private group with your new personal invite:\n${inviteLink}`
      );
    } catch (telegramError) {
      console.error("[activate] Telegram renewal notification failed:", telegramError);
    }
  }

  // 7) Send payment success email with Telegram link.
  if (!sub.email) {
    console.error(
      "[activate] No customer email found. Telegram email not sent."
    );
  } else {
    try {
      console.log(
        "[activate] Sending payment success email to:",
        sub.email
      );

      const emailSent = await sendPaymentSuccessEmail({
        to: sub.email,
        name: sub.name || "Customer",
        plan: claimed.plan as string,
        amount: claimed.amount,
        startDate,
        expiryDate,
        joinToken,
      });

      if (emailSent) {
        console.log(
          "[activate] Payment success email SENT successfully."
        );
      } else {
        console.error(
          "[activate] Payment success email FAILED."
        );
      }
    } catch (err) {
      console.error(
        "[activate] Notification delivery failed:",
        err
      );
    }
  }

  return {
    ok: true,
    alreadyProcessed: false,
  };
} 