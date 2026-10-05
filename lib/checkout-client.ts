"use client";

import { PLANS, type PlanId } from "./plans";
import { supabaseBrowser } from "./supabase-browser";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }

    const s = document.createElement("script");

    s.src = "https://checkout.razorpay.com/v1/checkout.js";

    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);

    document.body.appendChild(s);
  });
}

export type CheckoutResult =
  | {
      status: "paid";
      subscription: {
        plan: string;
        start_date: string;
        expiry_date: string;
        status: string;
      };
    }
  | {
      status: "cancelled";
    };

export async function startCheckout(opts: {
  plan: PlanId;
  name?: string;
  email?: string;
  prefill: {
    name?: string;
    email: string;
  };
}): Promise<CheckoutResult> {
  const { data } = await supabaseBrowser().auth.getSession();

  const token = data.session?.access_token;

  if (!token) {
    throw new Error(
      "Session expired. Please verify your email again."
    );
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Create Razorpay order
  const orderRes = await fetch("/api/orders/create", {
    method: "POST",
    headers,
    body: JSON.stringify({
      plan: opts.plan,
      name: opts.name,
      email: opts.email,
    }),
  });

  const order = await orderRes.json();

  if (!orderRes.ok) {
    throw new Error(
      order.error || "Could not start payment."
    );
  }

  // Load Razorpay
  const loaded = await loadRazorpayScript();

  if (!loaded || !window.Razorpay) {
    throw new Error("Could not load Razorpay.");
  }

  return new Promise<CheckoutResult>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,

      amount: order.amount,

      currency: order.currency,

      order_id: order.orderId,

      name: "Trade Zone Premium",

      description: PLANS[opts.plan].label,

      prefill: {
        name: opts.prefill.name,
        email: opts.prefill.email,
      },

      readonly: {
        name: !!opts.prefill.name,
        email: true,
      },

      theme: {
        color: "#10231F",
      },

      modal: {
        ondismiss: () => {
          resolve({
            status: "cancelled",
          });
        },
      },

      handler: async (response: any) => {
        try {
          const verifyRes = await fetch(
            "/api/orders/verify",
            {
              method: "POST",
              headers,

              body: JSON.stringify({
                razorpay_order_id:
                  response.razorpay_order_id,

                razorpay_payment_id:
                  response.razorpay_payment_id,

                razorpay_signature:
                  response.razorpay_signature,
              }),
            }
          );

          const result = await verifyRes.json();

          if (!verifyRes.ok) {
            throw new Error(
              result.error ||
                "Payment verification failed."
            );
          }

          resolve({
            status: "paid",
            subscription: result.subscription,
          });
        } catch (e) {
          reject(e);
        }
      },
    });

    rzp.open();
  });
}