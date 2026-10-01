import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Verify the requester is logged in
    const user = await getUserFromRequest(req);
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    
    // 2. Check if their email matches the ADMIN_EMAIL env variable
    if (!user || !adminEmail || user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const db = supabaseAdmin();
    const { data: subscriptions, error } = await db
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ subscriptions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
