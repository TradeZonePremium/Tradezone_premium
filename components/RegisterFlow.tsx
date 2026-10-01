"use client";

import { useState } from "react";
import EmailOtp from "./EmailOtp"; 
import PlanPicker from "./PlanPicker";
import { PLANS, type PlanId } from "@/lib/plans";
import { startCheckout } from "@/lib/checkout-client";
import { formatDate } from "@/lib/dates";

export default function RegisterFlow() {
  const [stage, setStage] = useState<"plan" | "details">("plan");
  const [plan, setPlan] = useState<PlanId>("1M");
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(""); // NEW: Simple phone state
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ plan: string; start_date: string; expiry_date: string; } | null>(null);

  async function pay() {
    setError("");

    if (!name.trim() || name.trim().length < 2) {
      return setError("Enter your full name.");
    }
    
    // Ensure they enter a valid phone number (just length validation)
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      return setError("Enter a valid mobile number (at least 10 digits).");
    }

    if (!verifiedEmail) {
      return setError("Please verify your email address with the OTP first.");
    }

    setBusy(true);

    try {
      const result = await startCheckout({
        plan,
        name: name.trim(),
        email: verifiedEmail,
        phone: digitsOnly, // Passing the phone number
        prefill: {
          name: name.trim(),
          email: verifiedEmail,
          contact: digitsOnly, // Prefills Razorpay so they don't have to type it again
        },
      });

      if (result.status === "paid") {
        setDone(result.subscription);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="card success">
        <h2>Payment successful</h2>
        <p>
          Your <b>{PLANS[done.plan as PlanId]?.label}</b> subscription is active until{" "}
          <b>{formatDate(done.expiry_date)}</b>.
        </p>
        <p>
          Your secure, one-time WhatsApp group access link has been sent to your 
          verified email inbox. Please check your email to join the community.
        </p>
      </section>
    );
  }

  return (
    <section className="card" aria-label="Choose a plan and register">
      <div hidden={stage !== "plan"}>
        <h2>Choose your plan</h2>
        <PlanPicker value={plan} onChange={setPlan} />
        <button type="button" className="btn btn-primary wide" onClick={() => setStage("details")}>
          Continue · ₹{PLANS[plan].price}
        </button>
        <p className="hint center">Next, we ask for your details and verify your email.</p>
      </div>

      <div hidden={stage !== "details"}>
        <button type="button" className="link back" onClick={() => setStage("plan")}>Change plan</button>
        <div className="chosen">
          <span>{PLANS[plan].label}</span>
          <b>₹{PLANS[plan].price}</b>
        </div>
        <h2>Your details</h2>

        <div className="field">
          <label className="label" htmlFor="name">Full name</label>
          <input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        {/* NEW: Mobile Number Field */}
        <div className="field">
          <label className="label" htmlFor="phone">WhatsApp / Mobile Number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 919876543210"
            maxLength={15}
          />
        </div>

        <div className="field">
          <EmailOtp
            onVerified={(data) => setVerifiedEmail(data.email)}
            onReset={() => setVerifiedEmail(null)}
          />
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <button
          type="button"
          className="btn btn-primary wide mt-4"
          onClick={pay}
          disabled={busy || !verifiedEmail || !name.trim() || phone.length < 10}
        >
          {busy ? "Opening payment…" : `Pay ₹${PLANS[plan].price}`}
        </button>
      </div>
    </section>
  );
}
