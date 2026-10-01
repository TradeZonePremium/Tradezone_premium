"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/dates";

export default function AdminDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/data")
      .then(async (res) => {
        if (!res.ok) throw new Error("You do not have admin permissions to view this page.");
        const json = await res.json();
        setData(json.subscriptions || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-center">Loading admin panel...</div>;
  
  if (error) {
    return (
      <div className="p-12 text-center text-red-600">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p>{error}</p>
        <p className="mt-4 text-sm text-gray-500">Ensure you are logged in with the admin email address.</p>
      </div>
    );
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>
      <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600">Name</th>
              <th className="p-4 font-semibold text-gray-600">Email</th>
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
