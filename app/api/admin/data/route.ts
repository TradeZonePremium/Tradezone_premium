import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Get the securely authenticated user
    const user = await getUserFromRequest(req);
    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. CHECK MULTIPLE ADMIN EMAILS
    // Splits the comma-separated Vercel variable into an array and checks if the user is in it
    const allowedEmails = (process.env.ADMIN_EMAIL || "")
      .split(",")
      .map(email => email.trim().toLowerCase());

    if (!allowedEmails.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: "Access Denied: Your email is not on the admin list." }, { status: 403 });
    }

    // 3. If they are an admin, fetch the data
    const db = supabaseAdmin();
    const { data: subscriptions, error } = await db
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ subscriptions });
  } catch (err: any) {
    console.error("[admin data]", err);
    return NextResponse.json({ error: "Failed to fetch admin data." }, { status: 500 });
  }
}
