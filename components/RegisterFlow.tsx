"use client";

import { useState } from "react";
import EmailOtp from "./EmailOtp";
import PlanPicker from "./PlanPicker";
import { PLANS, type PlanId } from "@/lib/plans";
import { startCheckout } from "@/lib/checkout-client";
import { formatDate } from "@/lib/dates";

/**
 * Step 1: choose a plan (only plans are shown)
 * Step 2: name + WhatsApp + email OTP, then pay.
 * The same name / number / email are passed to Razorpay, so the customer never types them twice.
 */
export default function RegisterFlow() {
  const [stage, setStage] = useState<"plan" | "details">("plan");
  const [plan, setPlan] = useState<PlanId>("1M");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ plan: string; start_date: string; expiry_date: string } | null>(null);

  const waDigits = whatsapp.replace(/\D/g, "");
  const detailsOk = name.trim().length >= 2 && waDigits.length >= 10 && waDigits.length <= 15;

  async function pay() {
    setError("");
    if (!detailsOk) return setError("Enter your full name and a valid WhatsApp number (10-15 digits).");
    if (!verifiedEmail) return setError("Verify your email first.");
    setBusy(true);
    try {
      const result = await startCheckout({
        plan,
        name: name.trim(),
        whatsapp: waDigits,
        prefill: { name: name.trim(), email: verifiedEmail, contact: waDigits },
      });
      if (result.status === "paid") setDone(result.subscription);
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
          Your <b>{PLANS[done.plan as PlanId]?.label}</b> subscription is active until <b>{formatDate(done.expiry_date)}</b>.
        </p>
        <p>
          We emailed your WhatsApp group link to <b>{verifiedEmail}</b>. If it is not in your inbox in a few minutes,
          check your spam folder.
        </p>
      </section>
    );
  }

  return (
    <section className="card" aria-label="Choose a plan and register">
      {/* ---------- Step 1: plans only ---------- */}
      <div hidden={stage !== "plan"}>
        <h2>Choose your plan</h2>
        <PlanPicker value={plan} onChange={setPlan} />
        <button type="button" className="btn btn-primary wide" onClick={() => setStage("details")}>
          Continue · ₹{PLANS[plan].price}
        </button>
        <p className="hint center">Next, we ask for your details and verify your email.</p>
      </div>

      {/* ---------- Step 2: details + email OTP + pay (kept mounted so OTP progress is not lost) ---------- */}
      <div hidden={stage !== "details"}>
        <button type="button" className="link back" onClick={() => setStage("plan")}>
          Change plan
        </button>
        <div className="chosen">
          <span>{PLANS[plan].label}</span>
          <b>₹{PLANS[plan].price}</b>
        </div>

        <h2>Your details</h2>

        <div className="field">
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
        </div>

        <div className="field">
          <label className="label" htmlFor="wa">WhatsApp number</label>
          <input
            id="wa"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="e.g. 9876543210"
          />
          <p className="hint">Include the country code if you are outside India. We save this number but do not verify it.</p>
        </div>

        <EmailOtp onVerified={({ email }) => setVerifiedEmail(email)} onReset={() => setVerifiedEmail(null)} />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="button" className="btn btn-primary wide" onClick={pay} disabled={busy || !verifiedEmail || !detailsOk}>
          {busy ? "Opening payment…" : `Pay ₹${PLANS[plan].price}`}
        </button>
        {(!verifiedEmail || !detailsOk) && (
          <p className="hint center">Fill in your details and verify your email to pay.</p>
        )}
      </div>
    </section>
  );
}
