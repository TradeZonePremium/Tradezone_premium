import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { todayIST } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Returns the logged-in customer's subscription (used on the /renew page).
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { data } = await supabaseAdmin()
    .from("subscriptions")
    .select("name, whatsapp_number, plan, status, expiry_date")
    .eq("email", user.email)
    .maybeSingle();

  if (!data || data.status === "PENDING") return NextResponse.json({ subscription: null, email: user.email });

  // Show EXPIRED immediately even if the daily job has not run yet.
  const status = data.status === "ACTIVE" && data.expiry_date < todayIST() ? "EXPIRED" : data.status;
  return NextResponse.json({ subscription: { ...data, status }, email: user.email });
}
