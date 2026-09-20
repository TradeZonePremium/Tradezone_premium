"use client";

import { useEffect, useState } from "react";
import EmailOtp from "@/components/EmailOtp";
import PlanPicker from "@/components/PlanPicker";
import { Header } from "@/components/Brand";
import { PLANS, planLabel, type PlanId } from "@/lib/plans";
import { addMonths, formatDate, maxDate, todayIST } from "@/lib/dates";
import { startCheckout } from "@/lib/checkout-client";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Sub = { name: string; whatsapp_number: string; plan: string | null; status: string; expiry_date: string | null };

export default function RenewPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [sub, setSub] = useState<Sub | null | undefined>(undefined); // undefined = not loaded
  const [plan, setPlan] = useState<PlanId>("1M");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  async function load(token: string) {
    const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (res.ok) {
      setEmail(json.email);
      setSub(json.subscription);
    }
  }

  // If they are already logged in from before, skip the OTP step.
  useEffect(() => {
    supabaseBrowser()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) load(data.session.access_token);
      });
  }, []);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    setEmail(null);
    setSub(undefined);
    setDone(null);
  }

  async function renew() {
    if (!email || !sub) return;
    setError("");
    setBusy(true);
    try {
      const result = await startCheckout({ plan, prefill: { name: sub.name, email, contact: sub.whatsapp_number } });
      if (result.status === "paid") setDone(result.subscription.expiry_date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const today = todayIST();
  const stillActive = !!sub && sub.status === "ACTIVE" && !!sub.expiry_date && sub.expiry_date >= today;
  const base = stillActive && sub?.expiry_date ? maxDate(sub.expiry_date, today) : today;
  const newExpiry = addMonths(base, PLANS[plan].months);

  return (
    <>
      <Header right={email ? <button className="link" onClick={signOut}>Sign out</button> : undefined} />
      <main className="shell narrow">
        <section className="card">
          <h1 className="h2">Renew your subscription</h1>

          {!email && (
            <>
              <p className="lead sm">Verify the email you registered with.</p>
              <EmailOtp onVerified={({ accessToken }) => load(accessToken)} />
            </>
          )}

          {email && sub === null && (
            <p>
              No subscription found for <b>{email}</b>. <a href="/">Register here</a> or sign out and try another email.
            </p>
          )}

          {email && sub && !done && (
            <>
              <div className="summary">
                <div>
                  <span className="label">Status</span>
                  <span className={`pill ${stillActive ? "ok" : "bad"}`}>{stillActive ? "Active" : "Expired"}</span>
                </div>
                <div>
                  <span className="label">Current plan</span>
                  <b>{planLabel(sub.plan)}</b>
                </div>
                <div>
                  <span className="label">{stillActive ? "Expires" : "Expired on"}</span>
                  <b>{formatDate(sub.expiry_date)}</b>
                </div>
              </div>

              <PlanPicker value={plan} onChange={setPlan} />

              <p className="hint">
                {stillActive
                  ? `Renewing now extends your access from ${formatDate(base)} to `
                  : "Your new period starts today and runs until "}
                <b>{formatDate(newExpiry)}</b>.
              </p>

              {error && <p className="error" role="alert">{error}</p>}
              <button className="btn btn-primary wide" onClick={renew} disabled={busy}>
                {busy ? "Opening payment…" : `Renew · ₹${PLANS[plan].price}`}
              </button>
            </>
          )}

          {done && (
            <div className="success">
              <h2>Renewed</h2>
              <p>Your subscription is now active until <b>{formatDate(done)}</b>. A confirmation email is on its way.</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
