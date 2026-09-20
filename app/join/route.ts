import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { todayIST } from "@/lib/dates";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "https://chat.whatsapp.com/AbCdEf123456" -> "AbCdEf123456" */
function inviteCode(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.trim().match(/chat\.whatsapp\.com\/([A-Za-z0-9]{10,40})/);
  return m ? m[1] : null;
}

/**
 * Masked WhatsApp link.
 *
 *  /join?token=<join_token>
 *    - not active / bad token  -> redirect to /renew
 *    - active                  -> small page on OUR domain that opens the WhatsApp app
 *                                 directly (whatsapp://chat?code=...). The address bar
 *                                 keeps showing our site, not chat.whatsapp.com.
 *  /join?token=<join_token>&go=1
 *    - fallback button (desktop / no app) -> redirect to the normal invite link.
 *
 * NOTE: nothing can hide the invite from someone who actually joins. This only stops
 * casual sharing. Keep "Approve new participants" ON in the WhatsApp group.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const renew = () => NextResponse.redirect(new URL("/renew", url.origin));

  if (!UUID.test(token)) return renew();

  const { data } = await supabaseAdmin()
    .from("subscriptions")
    .select("status, expiry_date")
    .eq("join_token", token)
    .maybeSingle();

  const active = !!data && data.status === "ACTIVE" && data.expiry_date >= todayIST();
  const invite = process.env.WHATSAPP_INVITE_URL;
  const code = inviteCode(invite);
  if (!active || !invite || !code) return renew();

  // Fallback: normal https invite link (works on desktop / phones without the deep link).
  if (url.searchParams.get("go") === "1") {
    const res = NextResponse.redirect(invite);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  // token and code are validated above (UUID / letters+digits only), so this is safe to embed.
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Opening WhatsApp…</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#EEF3F1;color:#10231F;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
  .box{background:#fff;border:1px solid #CBD8D3;border-radius:14px;padding:28px;max-width:420px;text-align:center}
  h1{font-family:Georgia,serif;font-size:1.5rem;margin:0 0 8px}
  p{color:#4B5E58;margin:0}
  a.btn{display:inline-block;margin-top:18px;background:#F2B01E;color:#10231F;font-weight:700;padding:14px 22px;border-radius:9px;text-decoration:none}
</style></head>
<body><div class="box">
  <h1>Opening WhatsApp…</h1>
  <p>If WhatsApp does not open by itself, tap the button below.</p>
  <a class="btn" href="/join?token=${token}&go=1">Open WhatsApp</a>
</div>
<script>setTimeout(function(){window.location.href="whatsapp://chat?code=${code}"},50);</script>
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}