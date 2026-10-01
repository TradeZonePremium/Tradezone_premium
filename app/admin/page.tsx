"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/dates";
import EmailOtp from "@/components/EmailOtp";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Header } from "@/components/Brand";

export default function AdminDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    
    const { data: sessionData } = await supabaseBrowser().auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }
    
    setNeedsLogin(false);

    try {
      const res = await fetch("/api/admin/data", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "You do not have admin permissions.");
      
      setData(json.subscriptions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header right={<a href="/" className="toplink">Back to Site</a>} />
        <div style={{ textAlign: "center", padding: "100px 20px", fontFamily: "sans-serif" }}>
          <h2>Loading secure dashboard...</h2>
        </div>
      </>
    );
  }

  // Beautiful Login Screen
  if (needsLogin) {
    return (
      <>
        <Header right={<a href="/" className="toplink">Back to Site</a>} />
        <main style={{ padding: "40px 20px", maxWidth: "500px", margin: "40px auto" }}>
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Admin Login</h2>
            <p style={{ color: "#5b6b66", marginBottom: "24px" }}>
              Verify your admin email to access the secure dashboard.
            </p>
            <div className="field">
              <EmailOtp onVerified={() => loadData()} onReset={() => {}} />
            </div>
          </section>
        </main>
      </>
    );
  }
  
  // Beautiful Error / Access Denied Screen
  if (error) {
    return (
      <>
        <Header right={<a href="/" className="toplink">Back to Site</a>} />
        <main style={{ padding: "40px 20px", maxWidth: "500px", margin: "40px auto" }}>
          <section className="card" style={{ textAlign: "center" }}>
            <h2 style={{ marginTop: 0, color: "#d93025" }}>Access Denied</h2>
            <p style={{ color: "#10231F", fontWeight: "bold" }}>{error}</p>
            <p style={{ color: "#5b6b66", fontSize: "14px", margin: "16px 0 24px" }}>
              Ensure you are logged in with an authorized admin email address.
            </p>
            <button 
              className="btn btn-primary wide"
              onClick={async () => { await supabaseBrowser().auth.signOut(); setNeedsLogin(true); setError(""); }} 
            >
              Sign out & try a different email
            </button>
          </section>
        </main>
      </>
    );
  }

  // Beautiful Full Dashboard
  return (
    <>
      <Header right={
        <button 
          onClick={async () => { await supabaseBrowser().auth.signOut(); setNeedsLogin(true); }} 
          style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", color: "#d93025" }}
        >
          Sign Out
        </button>
      } />
      
      <main style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" }}>
        <h1 style={{ marginBottom: "24px", color: "#10231F" }}>Admin Dashboard</h1>
        
        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: "#f8faf9", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "16px", color: "#5b6b66", fontWeight: "bold" }}>Name</th>
                  <th style={{ padding: "16px", color: "#5b6b66", fontWeight: "bold" }}>Email</th>
                  <th style={{ padding: "16px", color: "#5b6b66", fontWeight: "bold" }}>Phone</th>
                  <th style={{ padding: "16px", color: "#5b6b66", fontWeight: "bold" }}>Plan</th>
                  <th style={{ padding: "16px", color: "#5b6b66", fontWeight: "bold" }}>Status</th>
                  <th style={{ padding: "16px", color: "#5b6b66", fontWeight: "bold" }}>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {data.map((sub, i) => (
                  <tr key={sub.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "16px", color: "#10231F", fontWeight: "bold" }}>{sub.name}</td>
                    <td style={{ padding: "16px", color: "#5b6b66" }}>{sub.email}</td>
                    <td style={{ padding: "16px", color: "#5b6b66" }}>{sub.whatsapp_number || "—"}</td>
                    <td style={{ padding: "16px", color: "#5b6b66" }}>{sub.plan}</td>
                    <td style={{ padding: "16px" }}>
                      <span style={{
                        padding: "6px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold",
                        background: sub.status === 'ACTIVE' ? '#dcfce7' : sub.status === 'EXPIRED' ? '#fee2e2' : '#fef9c3',
                        color: sub.status === 'ACTIVE' ? '#166534' : sub.status === 'EXPIRED' ? '#991b1b' : '#854d0e'
                      }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ padding: "16px", color: "#5b6b66" }}>{sub.expiry_date ? formatDate(sub.expiry_date) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
