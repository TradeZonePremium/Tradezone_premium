import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminEmail } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { addDays, todayIST } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const db = supabaseAdmin();
  const today = todayIST();
  const in3 = addDays(today, 3);

  const [{ data: subs, error: subsErr }, { data: paid, error: payErr }] = await Promise.all([
    db
      .from("subscriptions")
      .select("id, name, email, whatsapp_number, plan, amount, razorpay_payment_id, start_date, expiry_date, status, created_at")
      .neq("status", "PENDING")
      .order("created_at", { ascending: false }),
    db.from("payments").select("amount").eq("status", "PAID"),
  ]);

  if (subsErr || payErr) {
    console.error("[admin/data]", subsErr || payErr);
    return NextResponse.json({ error: "Could not load data." }, { status: 500 });
  }

  // Effective status (in case the daily job has not run yet today)
  const customers = (subs || []).map((s) => ({
    ...s,
    status: s.status === "ACTIVE" && s.expiry_date < today ? "EXPIRED" : s.status,
    expiring_soon: s.status === "ACTIVE" && s.expiry_date >= today && s.expiry_date <= in3,
  }));

  const stats = {
    totalCustomers: customers.length,
    active: customers.filter((c) => c.status === "ACTIVE").length,
    expiringIn3Days: customers.filter((c) => c.expiring_soon).length,
    expired: customers.filter((c) => c.status === "EXPIRED").length,
    revenue: (paid || []).reduce((sum, p) => sum + (p.amount || 0), 0),
  };

  return NextResponse.json({ stats, customers });
}
