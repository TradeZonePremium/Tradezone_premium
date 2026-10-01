import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// 1. GET ROUTE: Shows the button page (Safe from Email Bots)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) return new Response("Missing token.", { status: 400 });

    const db = supabaseAdmin();

    // Verify token exists before showing the page
    const { data: sub, error } = await db
      .from("subscriptions")
      .select("id")
      .eq("join_token", token)
      .maybeSingle();

    if (error || !sub) {
      return new Response(
        "<div style='font-family:sans-serif; padding:40px; text-align:center;'><h2>Invalid or expired link.</h2><p>This invite link has already been used.</p></div>", 
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // Render a clean HTML page with a form button
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Join Trade Zone Premium</title>
        <style>
          body { font-family: sans-serif; background: #EEF3F1; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
          button { background: #10231F; color: white; border: none; padding: 16px 24px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; width: 100%; margin-top: 20px; transition: background 0.2s; }
          button:hover { background: #1a3832; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin-top:0; color:#10231F;">Welcome to the Community</h2>
          <p style="color:#5b6b66; font-size:15px; line-height:1.5;">Click the button below to join the private Trade Zone Premium WhatsApp group.</p>
          <p style="color:#d93025; font-size:13px; font-weight:bold;">Note: This is a one-time use link. It will expire immediately after clicking.</p>
          
          <!-- This form sends a POST request when clicked -->
          <form method="POST" action="/join?token=${token}">
            <button type="submit">Proceed to WhatsApp</button>
          </form>
        </div>
      </body>
      </html>
    `;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    console.error("[join GET] Error:", err);
    return new Response("Something went wrong", { status: 500 });
  }
}

// 2. POST ROUTE: Triggers when the human clicks the button (Destroys token & Redirects)
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) return new Response("Missing token.", { status: 400 });

    const db = supabaseAdmin();
    
    // Look up the token
    const { data: sub } = await db
      .from("subscriptions")
      .select("id")
      .eq("join_token", token)
      .maybeSingle();

    if (!sub) {
      return new Response(
        "<div style='font-family:sans-serif; padding:40px; text-align:center;'><h2>Link expired.</h2><p>This link has already been used.</p></div>", 
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // LOCK: Wipe the token from the database immediately so it can never be used again
    await db.from("subscriptions").update({ join_token: null }).eq("id", sub.id);

    // Pull secure WhatsApp group invite link
    const targetUrl = process.env.WHATSAPP_GROUP_INVITE_URL;
    if (!targetUrl) {
      return new Response("WhatsApp group link not configured.", { status: 500 });
    }

    // Securely redirect human to WhatsApp
    return NextResponse.redirect(targetUrl, { status: 302 });
  } catch (err) {
    console.error("[join POST] Error:", err);
    return new Response("Something went wrong", { status: 500 });
  }
}
