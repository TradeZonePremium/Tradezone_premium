import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { todayIST } from "@/lib/dates";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Masked WhatsApp link.
 * Email contains  https://your-site/join?token=<join_token>
 * Only ACTIVE (not expired) subscribers get redirected to the real invite link,
 * which lives in the WHATSAPP_INVITE_URL env variable (never in the email/site).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const renew = NextResponse.redirect(new URL("/renew", url.origin));

  if (!UUID.test(token)) return renew;

  const { data } = await supabaseAdmin()
    .from("subscriptions")
    .select("status, expiry_date")
    .eq("join_token", token)
    .maybeSingle();

  const active = data && data.status === "ACTIVE" && data.expiry_date >= todayIST();
  const invite = process.env.WHATSAPP_INVITE_URL;
  if (!active || !invite) return renew;

  const res = NextResponse.redirect(invite);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
