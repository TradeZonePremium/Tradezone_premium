"use client";

import { useState } from "react";

import WhatsAppOtp from "./WhatsAppOtp";
import PlanPicker from "./PlanPicker";

import { PLANS, type PlanId } from "@/lib/plans";
import { startCheckout } from "@/lib/checkout-client";
import { formatDate } from "@/lib/dates";

export default function RegisterFlow() {
  const [stage, setStage] = useState<"plan" | "details">("plan");

  const [plan, setPlan] = useState<PlanId>("1M");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  const [verifiedWhatsapp, setVerifiedWhatsapp] = useState<string | null>(
    null
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [done, setDone] = useState<{
    plan: string;
    start_date: string;
    expiry_date: string;
  } | null>(null);

  const waDigits = whatsapp.replace(/\D/g, "");

  const detailsOk =
    name.trim().length >= 2 &&
    waDigits.length >= 10 &&
    waDigits.length <= 15;

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function pay() {
    setError("");

    if (!name.trim() || name.trim().length < 2) {
      return setError("Enter your full name.");
    }

    if (!detailsOk) {
      return setError(
        "Enter a valid WhatsApp number (10-15 digits)."
      );
    }

    if (!verifiedWhatsapp) {
      return setError("Please verify your WhatsApp number first.");
    }

    if (!validEmail) {
      return setError("Enter a valid email address.");
    }

    setBusy(true);

    const finalWhatsapp = verifiedWhatsapp;
    const finalEmail = email.trim().toLowerCase();

    try {
      const result = await startCheckout({
        plan,
        name: name.trim(),
        whatsapp: finalWhatsapp,
        prefill: {
          name: name.trim(),
          email: finalEmail,
          contact: finalWhatsapp,
        },
      });

      if (result.status === "paid") {
        setDone(result.subscription);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="card success">
        <h2>Payment successful</h2>

        <p>
          Your{" "}
          <b>
            {PLANS[done.plan as PlanId]?.label}
          </b>{" "}
          subscription is active until{" "}
          <b>{formatDate(done.expiry_date)}</b>.
        </p>

        <p>
          Your WhatsApp group invitation will be sent to your
          verified WhatsApp number. Please check WhatsApp shortly
          after completing your payment.
        </p>
      </section>
    );
  }

  return (
    <section
      className="card"
      aria-label="Choose a plan and register"
    >
      {/* PLAN */}
      <div hidden={stage !== "plan"}>
        <h2>Choose your plan</h2>

        <PlanPicker
          value={plan}
          onChange={setPlan}
        />

        <button
          type="button"
          className="btn btn-primary wide"
          onClick={() => setStage("details")}
        >
          Continue · ₹{PLANS[plan].price}
        </button>

        <p className="hint center">
          Next, we ask for your details and verify your
          WhatsApp number.
        </p>
      </div>

      {/* DETAILS */}
      <div hidden={stage !== "details"}>
        <button
          type="button"
          className="link back"
          onClick={() => setStage("plan")}
        >
          Change plan
        </button>

        <div className="chosen">
          <span>{PLANS[plan].label}</span>
          <b>₹{PLANS[plan].price}</b>
        </div>

        <h2>Your details</h2>

        {/* NAME */}
        <div className="field">
          <label
            className="label"
            htmlFor="name"
          >
            Full name
          </label>

          <input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Your full name"
          />
        </div>

        {/* WHATSAPP */}
        <div className="field">
          <label
            className="label"
            htmlFor="wa"
          >
            WhatsApp number
          </label>

          <WhatsAppOtp
            defaultPhone={whatsapp}
            onPhoneChange={setWhatsapp}
            onVerified={(phone) =>
              setVerifiedWhatsapp(phone)
            }
            onReset={() =>
              setVerifiedWhatsapp(null)
            }
          />
        </div>

        {/* EMAIL */}
        <div className="field">
          <label
            className="label"
            htmlFor="email-input"
          >
            Email Address
          </label>

          <input
            id="email-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="you@example.com"
          />

          <p className="hint">
            Required for your payment receipt.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* PAYMENT */}
        <button
          type="button"
          className="btn btn-primary wide"
          onClick={pay}
          disabled={
            busy ||
            !verifiedWhatsapp ||
            !detailsOk ||
            !validEmail
          }
        >
          {busy
            ? "Opening payment…"
            : `Pay ₹${PLANS[plan].price}`}
        </button>
      </div>
    </section>
  );
}