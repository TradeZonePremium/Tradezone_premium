import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins
    
    // Fix: Call supabaseAdmin as a function ()
    const { error: dbError } = await supabaseAdmin().from("phone_verifications").insert({
      phone,
      otp_code: otp,
      expires_at: expiresAt,
    });

    if (dbError) throw new Error("Database error saving OTP");

    // 2. Send via Meta WhatsApp Cloud API
    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: process.env.WHATSAPP_OTP_TEMPLATE_NAME || "phone_verification_otp",
          language: { code: "en" },
          components: [
            { type: "body", parameters: [{ type: "text", text: otp }] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] },
          ],
        },
      }),
    });

    const metaData = await res.json();
    if (!res.ok) throw new Error(metaData.error?.message || "Meta API Error");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
