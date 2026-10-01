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

  // Calculate stats for the dashboard overview
  const activeCount = data.filter(s => s.status === 'ACTIVE').length;
  const pendingCount = data.filter(s => s.status === 'PENDING').length;

  return (
    <>
      <Header right={
        <button 
          onClick={async () => { await supabaseBrowser().auth.signOut(); setNeedsLogin(true); }} 
          style={{ 
            background: "#ffebee", color: "#d32f2f", border: "1px solid #ffcdd2", 
            padding: "8px 16px", borderRadius: "8px", cursor: "pointer", 
            fontWeight: "bold", fontSize: "14px", transition: "all 0.2s" 
          }}
        >
          Sign Out
        </button>
      } />
      
      <main style={{ padding: "40px 20px", maxWidth: "1100px", margin: "0 auto", fontFamily: "sans-serif" }}>
        
        {/* Page Title */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: "0 0 8px 0", color: "#10231F", fontSize: "32px", letterSpacing: "-0.5px" }}>Community Dashboard</h1>
          <p style={{ margin: 0, color: "#5b6b66", fontSize: "16px" }}>Manage your members and track active subscriptions.</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#5b6b66", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Total Members</div>
            <div style={{ fontSize: "36px", fontWeight: "bold", color: "#10231F", lineHeight: "1" }}>{data.length}</div>
          </div>
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#5b6b66", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Active</div>
            <div style={{ fontSize: "36px", fontWeight: "bold", color: "#166534", lineHeight: "1" }}>{activeCount}</div>
          </div>
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#5b6b66", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Pending</div>
            <div style={{ fontSize: "36px", fontWeight: "bold", color: "#854d0e", lineHeight: "1" }}>{pendingCount}</div>
          </div>
        </div>
        
        {/* Modern Table */}
        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
              <thead style={{ background: "#10231F", color: "#ffffff" }}>
                <tr>
                  <th style={{ padding: "16px 24px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>Member Name</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>Contact Info</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>Plan</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>Status</th>
                  <th style={{ padding: "16px 24px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {data.map((sub, i) => (
                  <tr key={sub.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#ffffff" : "#fbfdfc" }}>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontWeight: "bold", color: "#10231F", fontSize: "15px" }}>{sub.name}</div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ color: "#475569", fontSize: "14px", marginBottom: "4px" }}>✉️ {sub.email}</div>
                      <div style={{ color: "#475569", fontSize: "14px" }}>📱 {sub.whatsapp_number || "—"}</div>
                    </td>
                    <td style={{ padding: "16px 24px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>{sub.plan}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{
                        padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", display: "inline-block",
                        background: sub.status === 'ACTIVE' ? '#dcfce7' : sub.status === 'EXPIRED' ? '#fee2e2' : '#fef9c3',
                        color: sub.status === 'ACTIVE' ? '#166534' : sub.status === 'EXPIRED' ? '#991b1b' : '#854d0e',
                        border: `1px solid ${sub.status === 'ACTIVE' ? '#bbf7d0' : sub.status === 'EXPIRED' ? '#fecaca' : '#fef08a'}`
                      }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", color: "#475569", fontSize: "14px", fontWeight: "500" }}>
                      {sub.expiry_date ? formatDate(sub.expiry_date) : "—"}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#5b6b66" }}>
                      No members found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
