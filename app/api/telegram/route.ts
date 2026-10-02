import { NextRequest, NextResponse } from "next/server";

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

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    if (text === "/start") {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Welcome to Trade Zone Premium! 🚀\n\nYour Telegram bot is connected successfully.",
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