import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { razorpay } from "@/lib/razorpay";
import { PLANS, isPlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan = body.plan;
    if (!isPlanId(plan)) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.replace(/\D/g, "") : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    
    const nameOk = name.length >= 2 && name.length <= 100;
    const waOk = whatsapp.length >= 10 && whatsapp.length <= 15;

    if (!nameOk || !waOk) {
      return NextResponse.json(
        { error: "Enter your full name and a valid WhatsApp number (10-15 digits)." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    // STRICT CHECK: Verify that this WhatsApp number has completed OTP verification
    const { data: verification, error: verError } = await db
      .from("phone_verifications")
      .select("*")
      .eq("phone", whatsapp)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verError || !verification) {
      return NextResponse.json({ error: "Please verify your WhatsApp number with OTP first." }, { status: 401 });
    }

    if (new Date() > new Date(verification.expires_at)) {
      return NextResponse.json({ error: "WhatsApp verification expired. Please request a new OTP." }, { status: 401 });
    }

    // Find or create the customer row based on the WhatsApp number or email
    const { data: existing, error: findErr } = await db
      .from("subscriptions")
      .select("id")
      .eq("whatsapp_number", whatsapp)
      .maybeSingle();
    if (findErr) throw findErr;

    let subscriptionId: string;
    if (!existing) {
      const { data: created, error: insErr } = await db
        .from("subscriptions")
        .insert({ 
          name, 
          email: email || null, 
          whatsapp_number: whatsapp, 
          status: "PENDING" 
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      subscriptionId = created.id;
    } else {
      subscriptionId = existing.id;
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (nameOk) patch.name = name;
      if (email) patch.email = email;
      await db.from("subscriptions").update(patch).eq("id", subscriptionId);
    }

    // Price comes from OUR server, never from the browser. Razorpay wants paise.
    const price = PLANS[plan].price;
    const order = await razorpay().orders.create({
      amount: price * 100,
      currency: "INR",
      receipt: `tz_${Date.now()}`,
      notes: { subscription_id: subscriptionId, whatsapp, plan },
    });

    const { error: payErr } = await db.from("payments").insert({
      subscription_id: subscriptionId,
      razorpay_order_id: order.id,
      plan,
      amount: price,
      status: "CREATED",
    });
    if (payErr) throw payErr;

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error("[orders/create]", e);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
