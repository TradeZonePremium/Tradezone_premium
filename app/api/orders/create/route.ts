import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
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
    const emailInput = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const nameOk = name.length >= 2 && name.length <= 100;
    const waOk = whatsapp.length >= 10 && whatsapp.length <= 15;

    if (!nameOk || !waOk) {
      return NextResponse.json(
        { error: "Enter your full name and a valid WhatsApp number (10-15 digits)." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    // EITHER/OR AUTH CHECK:
    // 1) Check if user has an active email session via Supabase
    const user = await getUserFromRequest(req).catch(() => null);
    const hasEmailSession = !!user?.email;

    // 2) Check if user has a verified WhatsApp OTP record
    let hasValidWhatsapp = false;
    if (whatsapp) {
      const { data: verification } = await db
        .from("phone_verifications")
        .select("*")
        .eq("phone", whatsapp)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      hasValidWhatsapp = !!verification && new Date() <= new Date(verification.expires_at);
    }

    // If NEITHER method is verified, block order creation
    if (!hasEmailSession && !hasValidWhatsapp) {
      return NextResponse.json(
        { error: "Please verify either your email or your WhatsApp number with OTP to continue." },
        { status: 401 }
      );
    }

    // Determine the primary identifier for the subscription row
    const userEmail = user?.email || emailInput || null;

    // Find or create the customer row safely
    let subscriptionId: string;
    const { data: existing, error: findErr } = await db
      .from("subscriptions")
      .select("id")
      .or(`whatsapp_number.eq.${whatsapp}${userEmail ? `,email.eq.${userEmail}` : ""}`)
      .maybeSingle();

    if (findErr) throw findErr;

    if (!existing) {
      const { data: created, error: insErr } = await db
        .from("subscriptions")
        .insert({ 
          user_id: user?.id || null,
          name, 
          email: userEmail, 
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
      if (userEmail) patch.email = userEmail;
      if (waOk) patch.whatsapp_number = whatsapp;
      if (user?.id) patch.user_id = user.id;
      
      await db.from("subscriptions").update(patch).eq("id", subscriptionId);
    }

    // Create Razorpay Order
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
