import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { addDays, daysBetween, todayIST } from "@/lib/dates";
import { sendExpiredEmail, sendReminderEmail } from "@/lib/email";

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
  const summary = { reminders: 0, expired: 0, errors: 0 };
  
  const adminEmail = process.env.ADMIN_EMAIL; // Ensure this is set in Vercel

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
    const daysLeft = daysBetween(today, s.expiry_date);
    const ok = await sendReminderEmail({
      to: s.email,
      name: s.name,
      expiryDate: s.expiry_date,
      daysLeft,
    });
    
    if (ok) {
      await db.from("subscriptions").update({ reminder_sent: true }).eq("id", s.id);
      summary.reminders++;
      
      // Send CC to Admin
      if (adminEmail) {
        await sendReminderEmail({
          to: adminEmail,
          name: `Admin Alert (User: ${s.name} - ${s.email})`,
          expiryDate: s.expiry_date,
          daysLeft,
        });
      }
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
