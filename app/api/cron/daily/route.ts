import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { addDays, daysBetween, todayIST } from "@/lib/dates";
import { sendExpiredEmail, sendReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs once a day (see vercel.json).
 *  1) 3-day reminder for ACTIVE subscriptions that expire within 3 days
 *  2) Mark expired subscriptions as EXPIRED and email the customer
 *
 * Protected: requests must send  Authorization: Bearer <CRON_SECRET>
 * (Vercel Cron adds this header automatically when CRON_SECRET is set.)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const today = todayIST();
  const in3 = addDays(today, 3);
  const summary = { reminders: 0, expired: 0, errors: 0 };

  // ---- 1) Reminders: expiry between today and today+3, not yet reminded ----
  const { data: dueSoon, error: soonErr } = await db
    .from("subscriptions")
    .select("id, name, email, expiry_date")
    .eq("status", "ACTIVE")
    .eq("reminder_sent", false)
    .gte("expiry_date", today)
    .lte("expiry_date", in3);
  if (soonErr) {
    console.error("[cron] reminder query", soonErr);
    summary.errors++;
  }

  for (const s of dueSoon || []) {
    const ok = await sendReminderEmail({
      to: s.email,
      name: s.name,
      expiryDate: s.expiry_date,
      daysLeft: daysBetween(today, s.expiry_date),
    });
    if (ok) {
      await db.from("subscriptions").update({ reminder_sent: true }).eq("id", s.id);
      summary.reminders++;
    } else {
      summary.errors++; // stays false, so tomorrow's run retries
    }
  }

  // ---- 2) Expire: expiry_date < today ----
  const { data: lapsed, error: lapsedErr } = await db
    .from("subscriptions")
    .select("id, name, email")
    .eq("status", "ACTIVE")
    .lt("expiry_date", today);
  if (lapsedErr) {
    console.error("[cron] expiry query", lapsedErr);
    summary.errors++;
  }

  for (const s of lapsed || []) {
    // Conditional update: only one run can flip ACTIVE -> EXPIRED.
    const { data: flipped } = await db
      .from("subscriptions")
      .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
      .eq("id", s.id)
      .eq("status", "ACTIVE")
      .select("id")
      .maybeSingle();
    if (!flipped) continue;

    summary.expired++;
    const ok = await sendExpiredEmail({ to: s.email, name: s.name });
    if (ok) await db.from("subscriptions").update({ expired_email_sent: true }).eq("id", s.id);
    else summary.errors++;
  }

  return NextResponse.json({ ok: true, today, ...summary });
}
