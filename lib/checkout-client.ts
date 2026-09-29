"use client";

import { PLANS, type PlanId } from "./plans";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export type CheckoutResult =
  | { status: "paid"; subscription: { plan: string; start_date: string; expiry_date: string; status: string } }
  | { status: "cancelled" };

/**
 * 1) asks OUR server to create the Razorpay order (server decides the price)
 * 2) opens Razorpay Checkout
 * 3) sends the payment result to OUR server, which verifies the signature
 * The browser never decides that a payment succeeded.
 */
export async function startCheckout(opts: {
  plan: PlanId;
  name?: string;
  whatsapp?: string;
  prefill: { name?: string; email: string; contact?: string };
}): Promise<CheckoutResult> {
  // No email session required anymore. We rely on verified WhatsApp number.
  const headers = { "Content-Type": "application/json" };

  const orderRes = await fetch("/api/orders/create", {
    method: "POST",
    headers,
    body: JSON.stringify({ 
      plan: opts.plan, 
      name: opts.name, 
      whatsapp: opts.whatsapp || opts.prefill.contact,
      email: opts.prefill.email 
    }),
  });
  const order = await orderRes.json();
  if (!orderRes.ok) throw new Error(order.error || "Could not start payment.");

  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) throw new Error("Could not load Razorpay. Check your internet and try again.");

  // Razorpay likes the number with country code. 10 digits = Indian number.
  const digits = (opts.prefill.contact || opts.whatsapp || "").replace(/\D/g, "");
  const contact = digits ? (digits.length === 10 ? `+91${digits}` : `+${digits}`) : undefined;

  return new Promise<CheckoutResult>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "Trade Zone Premium",
      description: PLANS[opts.plan].label,
      // Details already collected on our page are carried over and locked,
      // so the customer is not asked to type them again.
      prefill: { name: opts.prefill.name, email: opts.prefill.email, contact },
      readonly: { name: !!opts.prefill.name, email: true, contact: !!contact },
      theme: { color: "#10231F" },
      modal: { ondismiss: () => resolve({ status: "cancelled" }) },
      handler: async (response: any) => {
        try {
          const verifyRes = await fetch("/api/orders/verify", {
            method: "POST",
            headers,
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const result = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(result.error || "Payment verification failed.");
          resolve({ status: "paid", subscription: result.subscription });
        } catch (e) {
          reject(e);
        }
      },
    });
    rzp.open();
  });
}
