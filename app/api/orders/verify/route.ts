import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { activatePayment } from "@/lib/activate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.razorpay_order_id || "");
    const paymentId = String(body.razorpay_payment_id || "");
    const signature = String(body.razorpay_signature || "");
    
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
    }

    // 1) The signature proves Razorpay (not the browser) confirmed this payment.
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const db = supabaseAdmin();

    // 2) Make sure this order exists in our payments table and retrieve its subscription ID
    const { data: row, error: rowErr } = await db
      .from("payments")
      .select("subscription_id, subscriptions!inner(id, whatsapp_number, plan)")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (rowErr || !row) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const subscriptionData = row.subscriptions as unknown as { id: string; whatsapp_number: string; plan: string };

    // 3) Activate (idempotent - safe if the webhook already did it).
    const result = await activatePayment(orderId, paymentId);
    if (!result.ok) {
      console.error("[orders/verify] activate failed:", result.error);
      return NextResponse.json(
        { error: "Payment received but activation is pending. Please contact support." },
        { status: 500 }
      );
    }

    // 4) Fetch the updated subscription details to return to the frontend
    const { data: sub, error: subErr } = await db
      .from("subscriptions")
      .select("plan, start_date, expiry_date, status")
      .eq("id", subscriptionData.id)
      .single();

    if (subErr || !sub) {
      return NextResponse.json({ error: "Subscription record could not be retrieved." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, subscription: sub });
  } catch (e) {
    console.error("[orders/verify]", e);
    return NextResponse.json({ error: "Verification error." }, { status: 500 });
  }
}
