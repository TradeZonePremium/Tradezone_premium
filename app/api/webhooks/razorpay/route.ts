import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { activatePayment } from "@/lib/activate";

export const dynamic = "force-dynamic";

/**
 * Backup path: if a customer pays and closes the tab before /api/orders/verify
 * runs, Razorpay still calls this webhook and we activate them.
 *
 * Razorpay Dashboard -> Account & Settings -> Webhooks -> Add:
 *   URL:    https://YOUR-DOMAIN/api/webhooks/razorpay
 *   Secret: same value as RAZORPAY_WEBHOOK_SECRET
 *   Events: payment.captured   (order.paid is also handled)
 */
export async function POST(req: Request) {
  const rawBody = await req.text(); // must be the RAW body for the signature check
  const signature = req.headers.get("x-razorpay-signature") || "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const paymentId = event.payload?.payment?.entity?.id;
    const orderId = event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;

    if (paymentId && orderId) {
      const result = await activatePayment(orderId, paymentId);
      if (!result.ok) {
        console.error("[webhook] activation failed:", result.error);
        // 5xx makes Razorpay retry later, except for orders that are not ours.
        if (result.error !== "Unknown order") {
          return NextResponse.json({ error: "Activation failed" }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
