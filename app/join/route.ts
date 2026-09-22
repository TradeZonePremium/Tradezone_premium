import { NextResponse } from "next/server";
import { getUserFromRequest, isAdminEmail } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { razorpay } from "@/lib/razorpay";
import { PLANS, isPlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Only customers who verified their email (Supabase session) can start a payment.
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please verify your email first." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const plan = body.plan;
    if (!isPlanId(plan)) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

    // The Rs 1 test plan can only be bought by admins, even if it is left switched on.
    if (plan === "TEST" && !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "This plan is not available." }, { status: 403 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.replace(/\D/g, "") : "";
    const nameOk = name.length >= 2 && name.length <= 100;
    const waOk = whatsapp.length >= 10 && whatsapp.length <= 15;

    const db = supabaseAdmin();

    // Find or create the customer row (one row per email).
    const { data: existing, error: findErr } = await db
      .from("subscriptions")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();
    if (findErr) throw findErr;

    let subscriptionId: string;
    if (!existing) {
      if (!nameOk || !waOk) {
        return NextResponse.json(
          { error: "Enter your full name and a valid WhatsApp number (10-15 digits)." },
          { status: 400 }
        );
      }
      const { data: created, error: insErr } = await db
        .from("subscriptions")
        .insert({ user_id: user.id, name, email: user.email, whatsapp_number: whatsapp, status: "PENDING" })
        .select("id")
        .single();
      if (insErr) throw insErr;
      subscriptionId = created.id;
    } else {
      subscriptionId = existing.id;
      const patch: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
      if (nameOk) patch.name = name;
      if (waOk) patch.whatsapp_number = whatsapp;
      await db.from("subscriptions").update(patch).eq("id", subscriptionId);
    }

    // Price comes from OUR server, never from the browser. Razorpay wants paise.
    const price = PLANS[plan].price;
    const order = await razorpay().orders.create({
      amount: price * 100,
      currency: "INR",
      receipt: `tz_${Date.now()}`,
      notes: { subscription_id: subscriptionId, email: user.email, plan },
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
