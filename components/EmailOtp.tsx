"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Props = {
  /** Called once the email is verified. */
  onVerified: (info: { email: string; accessToken: string }) => void;
  /** Called if the person goes back to change their email. */
  onReset?: () => void;
  defaultEmail?: string;
  label?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailOtp({ onVerified, onReset, defaultEmail = "", label = "Email" }: Props) {
  const [stage, setStage] = useState<"enter" | "code" | "verified">("enter");
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    setError("");
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) return setError("Enter a valid email address.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      return setError(
        error.status === 429 || /rate|seconds/i.test(error.message)
          ? "Too many attempts. Please wait a minute and try again."
          : "Could not send the code. Check the email and try again."
      );
    }
    setEmail(clean);
    setCode("");
    setStage("code");
    setCooldown(30);
  }

  async function verifyCode() {
    setError("");
    const token = code.replace(/\s/g, "");
    if (token.length < 6) return setError("Enter the code from your email.");
    setBusy(true);
    const { data, error } = await supabaseBrowser().auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (error || !data.session) return setError("That code is wrong or has expired. Request a new one.");
    setStage("verified");
    onVerified({ email, accessToken: data.session.access_token });
  }

  async function changeEmail() {
    await supabaseBrowser().auth.signOut();
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
            <b>{email}</b> is verified
          </span>
          <button type="button" className="link" onClick={changeEmail}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <label className="label" htmlFor="otp-email">
        {label}
      </label>
      <div className="row">
        <input
          id="otp-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          disabled={stage === "code"}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && stage === "enter" && sendCode()}
        />
        {stage === "enter" ? (
          <button type="button" className="btn btn-dark" onClick={sendCode} disabled={busy}>
            {busy ? "Sending…" : "Send OTP"}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={changeEmail}>
            Change
          </button>
        )}
      </div>

      {stage === "code" && (
        <>
          <label className="label" htmlFor="otp-code" style={{ marginTop: 14 }}>
            Code sent to your email
          </label>
          <div className="row">
            <input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter code"
              maxLength={10}
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
