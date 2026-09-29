import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { activatePayment } from "@/lib/activate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.razorpay_order_id || "");
    const paymentId = String(body.razorpay_payment_id || "");
    const signature = String(body.razorpay_signature || "");
    
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
    }

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: row } = await db
      .from("payments")
      .select("subscription_id, subscriptions!inner(email)")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    const owner = (row as unknown as { subscriptions?: { email?: string } } | null)?.subscriptions?.email;
    if (!row || owner?.toLowerCase() !== user.email) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const result = await activatePayment(orderId, paymentId);
    if (!result.ok) {
      console.error("[orders/verify] activate failed:", result.error);
      return NextResponse.json(
        { error: "Payment received but activation is pending. Please contact support." },
        { status: 500 }
      );
    }

    const { data: sub } = await db
      .from("subscriptions")
      .select("plan, start_date, expiry_date, status")
      .eq("email", user.email)
      .single();

    return NextResponse.json({ ok: true, subscription: sub });
  } catch (e) {
    console.error("[orders/verify]", e);
    return NextResponse.json({ error: "Verification error." }, { status: 500 });
  }
}
