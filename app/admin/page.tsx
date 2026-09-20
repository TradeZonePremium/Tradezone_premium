"use client";

import { useEffect, useMemo, useState } from "react";
import EmailOtp from "@/components/EmailOtp";
import { Header } from "@/components/Brand";
import { formatDate } from "@/lib/dates";
import { planLabel } from "@/lib/plans";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Customer = {
  id: string;
  name: string;
  email: string;
  whatsapp_number: string;
  plan: string | null;
  amount: number | null;
  razorpay_payment_id: string | null;
  start_date: string | null;
  expiry_date: string | null;
  status: string;
  expiring_soon: boolean;
};
type Stats = { totalCustomers: number; active: number; expiringIn3Days: number; expired: number; revenue: number };

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [data, setData] = useState<{ stats: Stats; customers: Customer[] } | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  async function load(token: string) {
    setError("");
    const res = await fetch("/api/admin/data", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (!res.ok) {
      setLoggedIn(true);
      setData(null);
      return setError(res.status === 403 ? "This email is not an admin. Add it to ADMIN_EMAILS." : json.error || "Failed to load.");
    }
    setLoggedIn(true);
    setData(json);
  }

  useEffect(() => {
    supabaseBrowser()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) load(data.session.access_token);
      });
  }, []);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    setLoggedIn(false);
    setData(null);
    setError("");
  }

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.customers.filter((c) => {
      if (filter === "EXPIRING") {
        if (!c.expiring_soon) return false;
      } else if (filter !== "ALL" && c.status !== filter) return false;
      if (!q) return true;
      return [c.name, c.email, c.whatsapp_number].some((v) => v.toLowerCase().includes(q));
    });
  }, [data, search, filter]);

  return (
    <>
      <Header right={loggedIn ? <button className="link" onClick={signOut}>Sign out</button> : undefined} />
      <main className="shell wide-shell">
        <h1 className="h2">Admin</h1>

        {!loggedIn && (
          <section className="card narrow-card">
            <p className="lead sm">Sign in with an admin email.</p>
            <EmailOtp onVerified={({ accessToken }) => load(accessToken)} />
          </section>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        {data && (
          <>
            <div className="stats">
              <Stat label="Total customers" value={data.stats.totalCustomers} />
              <Stat label="Active subscriptions" value={data.stats.active} />
              <Stat label="Expiring in 3 days" value={data.stats.expiringIn3Days} />
              <Stat label="Expired" value={data.stats.expired} />
              <Stat label="Revenue" value={`₹${data.stats.revenue.toLocaleString("en-IN")}`} />
            </div>

            <div className="toolbar">
              <input placeholder="Search name, email or WhatsApp" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRING">Expiring soon</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>WhatsApp</th><th>Plan</th><th>Payment</th>
                    <th>Start date</th><th>Expiry date</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.whatsapp_number}</td>
                      <td>{planLabel(c.plan)}</td>
                      <td title={c.razorpay_payment_id || ""}>{c.amount ? `₹${c.amount}` : "-"}</td>
                      <td>{formatDate(c.start_date)}</td>
                      <td>{formatDate(c.expiry_date)}</td>
                      <td><span className={`pill ${c.status === "ACTIVE" ? "ok" : "bad"}`}>{c.status}</span></td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="empty">No customers match. Change the search or filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
