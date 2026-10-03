"use client";

import { useState } from "react";
import EmailOtp from "@/components/EmailOtp";
import { PLANS, PlanId } from "@/lib/plans";
import { startCheckout } from "@/lib/checkout-client";

export default function RegisterFlow() {
  const [step, setStep] = useState<"PLAN" | "DETAILS">("PLAN");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("1M");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentPlan = PLANS[selectedPlan];

  async function handlePayment() {
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!isEmailVerified) {
      setError("Please verify your email with the OTP before continuing.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          name: name.trim(),
          whatsapp: cleanPhone,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || "Unable to initiate payment.");

      await startCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId,
        name: name.trim(),
        phone: cleanPhone,
      });
    } catch (err: any) {
      setError(err.message || "Payment initiation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: "440px", width: "100%", margin: "0 auto" }}>
      {step === "PLAN" ? (
        <div>
          <h2 style={{ marginTop: 0, marginBottom: "8px", fontSize: "22px", color: "#10231F" }}>
            Choose your plan
          </h2>
          <p style={{ color: "#5b6b66", fontSize: "14px", marginBottom: "20px" }}>Select plan</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {(Object.keys(PLANS) as PlanId[]).map((planKey) => {
              const p = PLANS[planKey];
              const isSelected = selectedPlan === planKey;
              return (
                <label
                  key={planKey}
                  onClick={() => setSelectedPlan(planKey)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderRadius: "10px",
                    border: isSelected ? "2px solid #10231F" : "1px solid #cbd5e1",
                    background: isSelected ? "#f8faf9" : "#fff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="radio"
                      name="plan_selection"
                      checked={isSelected}
                      onChange={() => setSelectedPlan(planKey)}
                      style={{ accentColor: "#10231F", width: "18px", height: "18px" }}
                    />
                    <div>
                      <div style={{ fontWeight: "700", color: "#10231F", fontSize: "15px" }}>{p.name}</div>
                      <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>{p.periodLabel}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "18px", color: "#10231F" }}>
                    ₹{p.price}
                  </div>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn-primary wide"
            onClick={() => setStep("DETAILS")}
            style={{
              width: "100%",
              padding: "14px",
              background: "#e89f3c",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Continue · ₹{currentPlan.price}
          </button>
          <p style={{ textAlign: "center", color: "#64748b", fontSize: "12px", marginTop: "12px" }}>
            Next, we ask for your details and verify your email.
          </p>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setStep("PLAN")}
            style={{
              background: "none",
              border: "none",
              color: "#10231F",
              textDecoration: "underline",
              fontSize: "13px",
              cursor: "pointer",
              padding: 0,
              marginBottom: "12px",
            }}
          >
            ← Change plan
          </button>

          <div
            style={{
              padding: "12px 16px",
              border: "1px solid #10231F",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <span style={{ fontWeight: "600", color: "#10231F" }}>{currentPlan.name}</span>
            <span style={{ fontWeight: "700", color: "#10231F", fontSize: "16px" }}>₹{currentPlan.price}</span>
          </div>

          <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#10231F" }}>Your details</h3>

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: "10px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
              Full name
            </label>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
              Mobile number
            </label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <EmailOtp
              onVerified={() => setIsEmailVerified(true)}
              onReset={() => setIsEmailVerified(false)}
            />
          </div>

          <button
            type="button"
            onClick={handlePayment}
            disabled={loading || !isEmailVerified}
            style={{
              width: "100%",
              padding: "14px",
              background: isEmailVerified ? "#e89f3c" : "#f1c07a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: isEmailVerified && !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Preparing checkout..." : `Pay ₹${currentPlan.price}`}
          </button>
        </div>
      )}
    </div>
  );
}
