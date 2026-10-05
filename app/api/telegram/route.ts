import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  createMemberInvite,
  sendTelegramMessage,
  GROUP_ID,
} from "@/lib/telegram";

const ADMIN_USER_ID = 1090578268;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update?.message;

    if (!message) return NextResponse.json({ ok: true });

    const chatId = message?.chat?.id;
    const text = message?.text?.trim() || "";
    const userId = message?.from?.id;

    if (!chatId || !userId) return NextResponse.json({ ok: true });

    // /start or /start <join_token>
    if (text === "/start" || text.startsWith("/start ")) {
      const parts = text.split(/\s+/);
      const joinToken = parts.length > 1 ? parts[1] : "";

      if (!joinToken) {
        await sendTelegramMessage(
          chatId,
          "Welcome to Trade Zone Premium! 🚀\n\nUse the personal Telegram connection link from your payment confirmation email."
        );
        return NextResponse.json({ ok: true });
      }

      const db = supabaseAdmin();
      const { data: subscription, error } = await db
        .from("subscriptions")
        .select("id, name, email, status, expiry_date, telegram_user_id")
        .eq("join_token", joinToken)
        .maybeSingle();

      if (error || !subscription) {
        await sendTelegramMessage(
          chatId,
          "❌ This connection link is invalid or expired. Please request a fresh link from Trade Zone Premium."
        );
        return NextResponse.json({ ok: true });
      }

      const today = new Date().toISOString().slice(0, 10);
      const active =
        subscription.status === "ACTIVE" &&
        !!subscription.expiry_date &&
        subscription.expiry_date >= today;

      if (!active) {
        await sendTelegramMessage(
          chatId,
          "❌ Your subscription is not active. Please renew your Trade Zone Premium subscription first."
        );
        return NextResponse.json({ ok: true });
      }

      // Prevent someone from reusing another customer's connection link
      // after that subscription has already been linked to Telegram.
      if (
        subscription.telegram_user_id &&
        Number(subscription.telegram_user_id) !== Number(userId)
      ) {
        await sendTelegramMessage(
          chatId,
          "❌ This membership is already connected to another Telegram account. Please contact support if you need to change it."
        );
        return NextResponse.json({ ok: true });
      }

      const { error: updateError } = await db
        .from("subscriptions")
        .update({
          telegram_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (updateError) {
        console.error("[telegram/start] link failed:", updateError);
        await sendTelegramMessage(chatId, "❌ Telegram connection failed. Please try again.");
        return NextResponse.json({ ok: true });
      }

      try {
        const inviteLink = await createMemberInvite();
        await sendTelegramMessage(
          chatId,
          `✅ Telegram connected successfully, ${subscription.name || "member"}! 🚀\n\n` +
            `Join the private Trade Zone Premium group here:\n${inviteLink}\n\n` +
            "This personal invite is limited to one member. Do not share it."
        );
      } catch (inviteError) {
        console.error("[telegram/start] invite creation failed:", inviteError);
        await sendTelegramMessage(
          chatId,
          "✅ Telegram account connected, but the group invite could not be generated right now. Please try /start again in a moment."
        );
      }

      return NextResponse.json({ ok: true });
    }

    // Admin-only manual invite command.
    if (text === "/invite") {
      if (userId !== ADMIN_USER_ID) return NextResponse.json({ ok: true });
      const inviteLink = await createMemberInvite();
      await sendTelegramMessage(chatId, `✅ New invite link:\n\n${inviteLink}`);
      return NextResponse.json({ ok: true });
    }

    if (text === "/myid") {
      await sendTelegramMessage(chatId, `Your Telegram User ID is:\n${userId}`);
      return NextResponse.json({ ok: true });
    }

    if (text === "/groupid") {
      await sendTelegramMessage(chatId, `Trade Zone Premium group ID is:\n${GROUP_ID}`);
      return NextResponse.json({ ok: true });
    }

    // Admin-only manual test removal.
    if (text === "/remove") {
      if (userId !== ADMIN_USER_ID) return NextResponse.json({ ok: true });

      const { removeTelegramMember } = await import("@/lib/telegram");
      const testUserId = 5510934074;
      const removed = await removeTelegramMember(testUserId);
      await sendTelegramMessage(
        chatId,
        removed
          ? "✅ Test user was removed/banned from Trade Zone Premium."
          : "❌ Test user removal failed."
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: "Telegram webhook failed" }, { status: 500 });
  }
}
