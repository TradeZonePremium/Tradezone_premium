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

    // 1. Secure database lookup to verify the token exists
    const { data: sub, error } = await db
      .from("subscriptions")
      .select("id, status")
      .eq("join_token", token)
      .maybeSingle();

    if (error || !sub) {
      // Return a user-friendly HTML error message instead of raw JSON
      return new Response(
        "<h2>Invalid, expired, or already used access link.</h2><p>Each link is valid for one-time use only. If you need a new link, please contact support.</p>", 
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // 2. ONE-TIME USE ENFORCEMENT: Nullify the token so it can never be used again
    await db.from("subscriptions").update({ join_token: null }).eq("id", sub.id);

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
