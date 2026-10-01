import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return new Response("Missing or invalid access token.", { status: 400 });
    }

    const db = supabaseAdmin();

    // 1. Look up the token (checking for both the original token and the secret 1st-use marker)
    const { data: sub, error } = await db
      .from("subscriptions")
      .select("id, status, join_token")
      .or(`join_token.eq.${token},join_token.eq.${token}_1`)
      .maybeSingle();

    if (error || !sub) {
      // Generic error message that completely hides the usage limit rules
      return new Response(
        "<h2>Invalid, expired, or already used access link.</h2><p>If you need a new link, please contact support.</p>", 
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // 2. SECRET 2-TIME USE LOGIC
    // If the token perfectly matches the URL, it's the 1st click. Append "_1".
    // If the token in the DB already has "_1", it's the 2nd click. Wipe it out (null).
    const nextTokenValue = sub.join_token === token ? `${token}_1` : null;

    const { error: updateErr } = await db
      .from("subscriptions")
      .update({ join_token: nextTokenValue })
      .eq("id", sub.id);

    if (updateErr) {
      console.error("[join] Failed to update token:", updateErr);
    }

    // 3. Pull your secure WhatsApp group invite link
    const targetUrl = process.env.WHATSAPP_GROUP_INVITE_URL;

    if (!targetUrl) {
      return new Response("WhatsApp group link not configured.", { status: 500 });
    }

    // 4. Securely redirect to the WhatsApp group
    return NextResponse.redirect(targetUrl);
    
  } catch (err: any) {
    console.error("[join] Error:", err);
    return new Response("Something went wrong", { status: 500 });
  }
}
