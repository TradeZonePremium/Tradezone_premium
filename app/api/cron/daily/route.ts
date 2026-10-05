import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { addDays, daysBetween, todayIST } from "@/lib/dates";
import { sendExpiredEmail, sendReminderEmail } from "@/lib/email";
import { removeTelegramMember, sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const today = todayIST();
  const in3 = addDays(today, 3);
  const summary = { reminders: 0, telegramReminders: 0, expired: 0, removed: 0, errors: 0 };
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  // 1) Reminder: expiry today through +3 days, once per subscription.
  const { data: dueSoon, error: soonErr } = await db
    .from("subscriptions")
    .select("id, name, email, expiry_date, telegram_user_id")
    .eq("status", "ACTIVE")
    .eq("reminder_sent", false)
    .gte("expiry_date", today)
    .lte("expiry_date", in3);

  if (soonErr) {
    console.error("[cron] reminder query:", soonErr);
    summary.errors++;
  }

  for (const s of dueSoon || []) {
    const daysLeft = daysBetween(today, s.expiry_date);
    const emailOk = await sendReminderEmail({
      to: s.email,
      name: s.name,
      expiryDate: s.expiry_date,
      daysLeft,
    });

    let telegramOk = true;
    if (s.telegram_user_id) {
      telegramOk = await sendTelegramMessage(
        Number(s.telegram_user_id),
        `⏰ Trade Zone Premium reminder\n\nHi ${s.name || "there"}, your subscription ${daysLeft <= 0 ? "expires today" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}.\n\nExpiry: ${s.expiry_date}\nRenew to keep your community access active.`
      );
      if (telegramOk) summary.telegramReminders++;
    }

    if (emailOk || telegramOk) {
      await db.from("subscriptions").update({ reminder_sent: true, updated_at: new Date().toISOString() }).eq("id", s.id);
      summary.reminders++;
    } else {
      summary.errors++;
    }

    if (emailOk && adminEmails.length) {
      for (const adminEmail of adminEmails) {
        await sendReminderEmail({
          to: adminEmail,
          name: `Admin Alert (User: ${s.name} - ${s.email})`,
          expiryDate: s.expiry_date,
          daysLeft,
        });
      }
    }
  }

  // 2) Expire subscriptions and remove their Telegram access.
  const { data: lapsed, error: lapsedErr } = await db
    .from("subscriptions")
    .select("id, name, email, telegram_user_id")
    .eq("status", "ACTIVE")
    .lt("expiry_date", today);

  if (lapsedErr) {
    console.error("[cron] expiry query:", lapsedErr);
    summary.errors++;
  }

  for (const s of lapsed || []) {
    const { data: flipped, error: flipError } = await db
      .from("subscriptions")
      .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
      .eq("id", s.id)
      .eq("status", "ACTIVE")
      .select("id")
      .maybeSingle();

    if (flipError) {
      console.error("[cron] expiry update:", flipError);
      summary.errors++;
      continue;
    }

    if (!flipped) continue;
    summary.expired++;

    if (s.telegram_user_id) {
      const removed = await removeTelegramMember(Number(s.telegram_user_id));
      if (removed) {
        summary.removed++;
        await sendTelegramMessage(
          Number(s.telegram_user_id),
          "🔒 Your Trade Zone Premium subscription has expired and your group access has been removed.\n\nRenew your subscription to regain access."
        );
      } else {
        summary.errors++;
      }
    }

    const emailOk = await sendExpiredEmail({ to: s.email, name: s.name });
    if (emailOk) {
      await db.from("subscriptions").update({ expired_email_sent: true }).eq("id", s.id);
    } else {
      summary.errors++;
    }
  }

  return NextResponse.json({ ok: true, today, ...summary });
}
