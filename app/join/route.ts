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

    // 1. Secure database lookup to verify the token exists
    const { data: sub, error } = await db
      .from("subscriptions")
      .select("id, status")
      .eq("join_token", token)
      .maybeSingle();

    if (error || !sub) {
      return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
    }

    // 2. Pull your secure WhatsApp group invite link from Vercel environment variables
    const targetUrl = process.env.WHATSAPP_GROUP_INVITE_URL;

    if (!targetUrl) {
      return NextResponse.json({ error: "WhatsApp group link not configured." }, { status: 500 });
    }

    // 3. Securely redirect to the WhatsApp group
    return NextResponse.redirect(targetUrl);
    
  } catch (err: any) {
    console.error("[join] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
