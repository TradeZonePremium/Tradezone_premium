import { supabaseAdmin } from "./supabase-server";

export type AuthedUser = { id: string; email: string };

/**
 * Reads "Authorization: Bearer <supabase access token>" and returns the
 * verified user (Supabase checks the token). Returns null if not logged in.
 */
export async function getUserFromRequest(req: Request): Promise<AuthedUser | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user || !data.user.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}

export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
