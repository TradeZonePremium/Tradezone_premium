"use client";

import { useEffect, useState } from "react";

type Props = {
  onVerified: (phone: string) => void;
  onReset?: () => void;
  defaultPhone?: string;
  onPhoneChange?: (phone: string) => void;
  label?: string;
};

export default function WhatsAppOtp({ onVerified, onReset, defaultPhone = "", onPhoneChange, label = "WhatsApp Number" }: Props) {
  const [stage, setStage] = useState<"enter" | "code" | "verified">("enter");
  const [phone, setPhone] = useState(defaultPhone);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    onPhoneChange?.(val);
  };

  async function sendCode() {
    setError("");
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return setError("Enter a valid WhatsApp number with country code.");
    
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      
      setCode("");
      setStage("code");
      setCooldown(30);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setError("");
    const token = code.replace(/\s/g, "");
    if (token.length < 6) return setError("Enter the 6-digit code sent to your WhatsApp.");
    
    setBusy(true);
    try {
      const res = await fetch("/api/whatsapp/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ""), otp: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid or expired code");
      
      setStage("verified");
      onVerified(data.phone);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function changePhone() {
    setStage("enter");
    setCode("");
    setError("");
    onReset?.();
  }

  if (stage === "verified") {
    return (
      <div className="field">
        <span className="label">{label}</span>
        <div className="verified">
          <span>
            <b>+{phone.replace(/\D/g, "")}</b> is verified
          </span>
          <button type="button" className="link" onClick={changePhone}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <label className="label" htmlFor="otp-wa">
        {label}
      </label>
      <div className="row">
        <input
          id="otp-wa"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="e.g. 919876543210"
          value={phone}
          disabled={stage === "code"}
          onChange={(e) => handlePhoneChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && stage === "enter" && sendCode()}
        />
        {stage === "enter" ? (
          <button type="button" className="btn btn-dark" onClick={sendCode} disabled={busy}>
            {busy ? "Sending…" : "Send OTP"}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={changePhone}>
            Change
          </button>
        )}
      </div>
      {stage === "enter" && <p className="hint">Include your country code (e.g. 91 for India).</p>}

      {stage === "code" && (
        <>
          <label className="label" htmlFor="wa-otp-code" style={{ marginTop: 14 }}>
            Code sent to WhatsApp
          </label>
          <div className="row">
            <input
              id="wa-otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && verifyCode()}
              className="otp"
              autoFocus
            />
            <button type="button" className="btn btn-dark" onClick={verifyCode} disabled={busy}>
              {busy ? "Checking…" : "Verify OTP"}
            </button>
          </div>
          <button type="button" className="link" onClick={sendCode} disabled={busy || cooldown > 0}>
            {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
          </button>
        </>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
