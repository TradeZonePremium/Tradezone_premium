"use client";

import { useState } from "react";

import EmailOtp from "./EmailOtp";
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
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const [method, setMethod] = useState<"email" | "whatsapp">("email");

  const [verifiedIdentifier, setVerifiedIdentifier] = useState<{
    type: "email" | "whatsapp";
    value: string;
  } | null>(null);

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

  // If verified via WhatsApp, we still need a valid email for the DB/Razorpay.
  const hasRequiredEmail =
    verifiedIdentifier?.type === "email" ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(unverifiedEmail);

  async function pay() {
    setError("");

    if (!detailsOk) {
      return setError(
        "Enter your full name and a valid WhatsApp number (10-15 digits)."
      );
    }

    if (!verifiedIdentifier) {
      return setError(
        `Verify your ${
          method === "whatsapp" ? "WhatsApp number" : "email"
        } first.`
      );
    }

    if (!hasRequiredEmail) {
      return setError("A valid email address is required for your receipt.");
    }

    setBusy(true);

    const finalEmail =
      verifiedIdentifier.type === "email"
        ? verifiedIdentifier.value
        : unverifiedEmail.trim().toLowerCase();

    const finalWhatsapp =
      verifiedIdentifier.type === "whatsapp"
        ? verifiedIdentifier.value
        : waDigits;

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
        e instanceof Error ? e.message : "Something went wrong."
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
          <b>{PLANS[done.plan as PlanId]?.label}</b>{" "}
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
          Next, we ask for your details and verify your account.
        </p>
      </div>

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

        <div className="field">
          <label className="label" htmlFor="name">
            Full name
          </label>

          <input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        {/* Verification Toggle */}
        <div className="field">
          <label className="label">
            Verification Method
          </label>

          <div
            className="row"
            style={{
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <button
              type="button"
              className={`btn ${
                method === "email"
                  ? "btn-dark"
                  : "btn-ghost"
              }`}
              onClick={() => {
                setMethod("email");
                setVerifiedIdentifier(null);
              }}
              style={{ flex: 1 }}
            >
              Verify Email
            </button>

            <button
              type="button"
              className={`btn ${
                method === "whatsapp"
                  ? "btn-dark"
                  : "btn-ghost"
              }`}
              onClick={() => {
                setMethod("whatsapp");
                setVerifiedIdentifier(null);
              }}
              style={{ flex: 1 }}
            >
              Verify WhatsApp
            </button>
          </div>
        </div>

        {method === "email" ? (
          <>
            <div className="field">
              <label
                className="label"
                htmlFor="wa"
              >
                WhatsApp number
              </label>

              <input
                id="wa"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(e.target.value)
                }
                placeholder="e.g. 9876543210"
              />
            </div>

            <EmailOtp
              onVerified={({ email }) =>
                setVerifiedIdentifier({
                  type: "email",
                  value: email,
                })
              }
              onReset={() =>
                setVerifiedIdentifier(null)
              }
            />
          </>
        ) : (
          <>
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
                value={unverifiedEmail}
                onChange={(e) =>
                  setUnverifiedEmail(e.target.value)
                }
                placeholder="you@example.com"
              />

              <p className="hint">
                Required for payment receipts.
              </p>
            </div>

            <WhatsAppOtp
              defaultPhone={whatsapp}
              onPhoneChange={setWhatsapp}
              onVerified={(phone) =>
                setVerifiedIdentifier({
                  type: "whatsapp",
                  value: phone,
                })
              }
              onReset={() =>
                setVerifiedIdentifier(null)
              }
            />
          </>
        )}

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
          className="btn btn-primary wide"
          onClick={pay}
          disabled={
            busy ||
            !verifiedIdentifier ||
            !detailsOk ||
            !hasRequiredEmail
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