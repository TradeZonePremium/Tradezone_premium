"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/dates";
import EmailOtp from "@/components/EmailOtp";
import { supabaseBrowser } from "@/lib/supabase-browser";

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
    
    // 1. Get the current user session
    const { data: sessionData } = await supabaseBrowser().auth.getSession();
    const token = sessionData.session?.access_token;

    // 2. If no session, show the login screen
    if (!token) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }
    
    setNeedsLogin(false);

    try {
      // 3. Fetch data with the secure Auth token attached
      const res = await fetch("/api/admin/data", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error("You do not have admin permissions to view this page.");
      
      const json = await res.json();
      setData(json.subscriptions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-12 text-center">Loading admin panel...</div>;

  // Render Login Screen if not authenticated
  if (needsLogin) {
    return (
      <div className="p-12 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-2">Admin Login</h2>
        <p className="mb-6 text-sm text-gray-600">Please verify your admin email to securely access the dashboard.</p>
        <EmailOtp 
          onVerified={() => loadData()} 
          onReset={() => {}}
        />
      </div>
    );
  }
  
  // Render Error Screen if authenticated but not an admin
  if (error) {
    return (
      <div className="p-12 text-center text-red-600">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="mt-2">{error}</p>
        <p className="mt-4 text-sm text-gray-500">Ensure you are logged in with the exact admin email address.</p>
        <button 
          onClick={async () => { await supabaseBrowser().auth.signOut(); setNeedsLogin(true); setError(""); }} 
          className="mt-6 font-semibold underline text-blue-600"
        >
          Sign out and try a different email
        </button>
      </div>
    );
  }

  // Render Admin Dashboard
  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <button 
          onClick={async () => { await supabaseBrowser().auth.signOut(); setNeedsLogin(true); }} 
          className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
      <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600">Name</th>
              <th className="p-4 font-semibold text-gray-600">Email</th>
              <th className="p-4 font-semibold text-gray-600">Phone</th>
              <th className="p-4 font-semibold text-gray-600">Plan</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((sub) => (
              <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 text-gray-800">{sub.name}</td>
                <td className="p-4 text-gray-600">{sub.email}</td>
                <td className="p-4 text-gray-600">{sub.whatsapp_number || "N/A"}</td>
                <td className="p-4 text-gray-600">{sub.plan}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                    sub.status === 'EXPIRED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{sub.expiry_date ? formatDate(sub.expiry_date) : "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
