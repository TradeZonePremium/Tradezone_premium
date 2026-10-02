import { NextRequest, NextResponse } from "next/server";

const GROUP_ID = -5501936412;

// Only for testing.
// This should be your admin/owner Telegram User ID.
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
    const chatId = message?.chat?.id;
    const text = message?.text;
    const userId = message?.from?.id;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    // /start
    if (text === "/start") {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            "Welcome to Trade Zone Premium! 🚀\n\n" +
            "Your Telegram bot is connected successfully.",
        }),
      });
    }

    // /invite
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

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: "❌ Invite link could not be generated.",
          }),
        });

        return NextResponse.json({ ok: true });
      }

      const inviteLink = result.result.invite_link;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            "✅ New Trade Zone Premium invite link:\n\n" +
            inviteLink +
            "\n\n" +
            "This link is limited to 1 member.",
        }),
      });
    }

    // /myid
    if (text === "/myid") {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Your Telegram User ID is:\n${userId}`,
        }),
      });
    }

    // /groupid
    if (text === "/groupid") {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: `This chat/group ID is:\n${chatId}`,
        }),
      });
    }

    // /remove
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
            user_id: 5510934074,
            revoke_messages: false,
          }),
        }
      );

      const result = await response.json();

      console.log("Telegram remove result:", result);

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: result.ok
            ? "✅ Test user was removed/banned from Trade Zone Premium."
            : `❌ Remove failed: ${result.description || "Unknown error"}`,
        }),
      });
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