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
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Enter a valid full name." }, { status: 400 });
    }

    // Extract the phone number safely
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.replace(/\D/g, "") : "";

    const db = supabaseAdmin();

    const user = await getUserFromRequest(req).catch(() => null);
    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Please verify your email with OTP to continue." },
        { status: 401 }
      );
    }

    const userEmail = user.email;

    let subscriptionId: string;
    const { data: existing, error: findErr } = await db
      .from("subscriptions")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (findErr) throw findErr;

    if (!existing) {
      const { data: created, error: insErr } = await db
        .from("subscriptions")
        .insert({ 
          user_id: user.id,
          name, 
          email: userEmail, 
          whatsapp_number: whatsapp, // SAVE TO DB
          status: "PENDING" 
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      subscriptionId = created.id;
    } else {
      subscriptionId = existing.id;
      await db.from("subscriptions").update({
        name,
        user_id: user.id,
        whatsapp_number: whatsapp, // UPDATE DB
        updated_at: new Date().toISOString()
      }).eq("id", subscriptionId);
    }

    const price = PLANS[plan].price;
    const order = await razorpay().orders.create({
      amount: price * 100,
      currency: "INR",
      receipt: `tz_${Date.now()}`,
      notes: { subscription_id: subscriptionId, plan },
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
