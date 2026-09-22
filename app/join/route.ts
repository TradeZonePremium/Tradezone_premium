import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Verify token exists in your database
    const { data: sub, error } = await db
      .from("subscriptions")
      .select("id, status, whatsapp_invite_link")
      .eq("join_token", token)
      .maybeSingle();

    if (error || !sub) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    // Default WhatsApp group link fallback
    const targetUrl = sub.whatsapp_invite_link || process.env.WHATSAPP_GROUP_INVITE_URL;

    if (!targetUrl) {
      return NextResponse.json({ error: "Group invite link not configured" }, { status: 500 });
    }

    // Redirect the user directly to WhatsApp
    return NextResponse.redirect(targetUrl);
    
  } catch (err: any) {
    console.error("[join] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
