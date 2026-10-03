import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

const GROUP_ID = -5501936412;

// Only for testing/admin commands.
const ADMIN_USER_ID = 1090578268;

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN is missing" },
        { status: 500 }
      );
    }

    const message = update?.message;

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message?.chat?.id;
    const text = message?.text?.trim() || "";
    const userId = message?.from?.id;

    if (!chatId || !userId) {
      return NextResponse.json({ ok: true });
    }

    const sendMessage = async (chat_id: number | string, messageText: string) => {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id,
          text: messageText,
        }),
      });
    };

    // =========================================================
    // /start
    // Supports:
    // /start
    // /start <join_token>
    // =========================================================
    if (text === "/start" || text.startsWith("/start ")) {
      const parts = text.split(/\s+/);
      const joinToken = parts.length > 1 ? parts[1] : "";

      // -------------------------------------------------------
      // Normal /start without token
      // -------------------------------------------------------
      if (!joinToken) {
        await sendMessage(
          chatId,
          "Welcome to Trade Zone Premium! 🚀\n\n" +
            "Your Telegram bot is connected successfully.\n\n" +
            "Please use the Telegram connection link from the Trade Zone Premium website."
        );

        return NextResponse.json({ ok: true });
      }

      // -------------------------------------------------------
      // /start <join_token>
      // Link Telegram account with subscription
      // -------------------------------------------------------
      const db = supabaseAdmin();

      const { data: subscription, error: findError } = await db
        .from("subscriptions")
        .select("id, name, email, status, expiry_date")
        .eq("join_token", joinToken)
        .maybeSingle();

      if (findError) {
        console.error("[telegram/start] subscription lookup failed:", findError);

        await sendMessage(
          chatId,
          "❌ We could not connect your Telegram account right now. Please try again."
        );

        return NextResponse.json({ ok: true });
      }

      if (!subscription) {
        await sendMessage(
          chatId,
          "❌ This Telegram connection link is invalid or expired.\n\n" +
            "Please return to the Trade Zone Premium website and generate a new connection link."
        );

        return NextResponse.json({ ok: true });
      }

      // -------------------------------------------------------
      // Save Telegram User ID
      // -------------------------------------------------------
      const { error: updateError } = await db
        .from("subscriptions")
        .update({
          telegram_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (updateError) {
        console.error(
          "[telegram/start] failed to save Telegram user ID:",
          updateError
        );

        await sendMessage(
          chatId,
          "❌ Telegram connection could not be completed. Please try again."
        );

        return NextResponse.json({ ok: true });
      }

      await sendMessage(
        chatId,
        "✅ Telegram connected successfully!\n\n" +
          `Welcome ${subscription.name || "to Trade Zone Premium"} 🚀\n\n` +
          "Your Telegram account is now linked with your Trade Zone Premium membership.\n\n" +
          "You can return to the website and continue your payment."
      );

      console.log(
        `[telegram/start] Telegram user ${userId} linked to subscription ${subscription.id}`
      );

      return NextResponse.json({ ok: true });
    }

    // =========================================================
    // /invite
    // =========================================================
    if (text === "/invite") {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/createChatInviteLink`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: GROUP_ID,
            member_limit: 1,
          }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        console.error("Telegram invite error:", result);

        await sendMessage(
          chatId,
          "❌ Invite link could not be generated."
        );

        return NextResponse.json({ ok: true });
      }

      const inviteLink = result.result.invite_link;

      await sendMessage(
        chatId,
        "✅ New Trade Zone Premium invite link:\n\n" +
          inviteLink +
          "\n\n" +
          "This link is limited to 1 member."
      );

      return NextResponse.json({ ok: true });
    }

    // =========================================================
    // /myid
    // =========================================================
    if (text === "/myid") {
      await sendMessage(
        chatId,
        `Your Telegram User ID is:\n${userId}`
      );

      return NextResponse.json({ ok: true });
    }

    // =========================================================
    // /groupid
    // =========================================================
    if (text === "/groupid") {
      await sendMessage(
        chatId,
        `This chat/group ID is:\n${chatId}`
      );

      return NextResponse.json({ ok: true });
    }

    // =========================================================
    // /remove
    // TEST ONLY
    // =========================================================
    if (text === "/remove") {
      if (userId !== ADMIN_USER_ID) {
        return NextResponse.json({ ok: true });
      }

      const response = await fetch(
        `https://api.telegram.org/bot${token}/banChatMember`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: GROUP_ID,

            // Test member ID
            user_id: 5510934074,

            revoke_messages: false,
          }),
        }
      );

      const result = await response.json();

      console.log("Telegram remove result:", result);

      await sendMessage(
        chatId,
        result.ok
          ? "✅ Test user was removed/banned from Trade Zone Premium."
          : `❌ Remove failed: ${
              result.description || "Unknown error"
            }`
      );

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);

    return NextResponse.json(
      { error: "Telegram webhook failed" },
      { status: 500 }
    );
  }
}