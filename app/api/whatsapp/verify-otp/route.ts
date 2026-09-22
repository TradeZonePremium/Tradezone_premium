import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();
    if (!phone || !otp) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    // Find the latest valid OTP using supabaseAdmin
    const { data: record, error } = await supabaseAdmin
      .from("phone_verifications")
      .select("*")
      .eq("phone", phone)
      .eq("otp_code", otp)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !record) return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });

    // Mark as used
    await supabaseAdmin.from("phone_verifications").update({ verified: true }).eq("id", record.id);

    return NextResponse.json({ success: true, phone });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
