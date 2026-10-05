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
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [done, setDone] = useState<{
    plan: string;
    start_date: string;
    expiry_date: string;
  } | null>(null);

  async function pay() {
    setError("");

    if (!name.trim() || name.trim().length < 2) {
      return setError("Enter your full name.");
    }

    if (!verifiedEmail) {
      return setError(
        "Please verify your email address with the OTP first."
      );
    }

    setBusy(true);

    try {
      const result = await startCheckout({
        plan,
        name: name.trim(),
        email: verifiedEmail,
        prefill: {
          name: name.trim(),
          email: verifiedEmail,
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
          Please check your verified email inbox for your
          personal Telegram connection link.
        </p>

        <p>
          Open that link and connect your Telegram account
          with Trade Zone Premium.
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
          Next, we ask for your details and verify your email.
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

        {/* EMAIL OTP */}
        <div className="field">
          <EmailOtp
            onVerified={(data) =>
              setVerifiedEmail(data.email)
            }
            onReset={() =>
              setVerifiedEmail(null)
            }
          />
        </div>

        {error && (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary wide mt-4"
          onClick={pay}
          disabled={
            busy ||
            !verifiedEmail ||
            !name.trim()
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