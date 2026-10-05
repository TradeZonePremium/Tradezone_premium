const GROUP_ID = -5501936412;

function token() {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  return value;
}

async function telegramApi(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.description || `Telegram ${method} failed`);
  }
  return json.result;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string
): Promise<boolean> {
  try {
    await telegramApi("sendMessage", { chat_id: chatId, text });
    return true;
  } catch (error) {
    console.error("[telegram] sendMessage failed:", error);
    return false;
  }
}

export async function createMemberInvite(): Promise<string> {
  const result = await telegramApi("createChatInviteLink", {
    chat_id: GROUP_ID,
    member_limit: 1,
  });
  return result.invite_link as string;
}

export async function removeTelegramMember(userId: number): Promise<boolean> {
  try {
    await telegramApi("banChatMember", {
      chat_id: GROUP_ID,
      user_id: userId,
      revoke_messages: false,
    });
    return true;
  } catch (error) {
    console.error(`[telegram] failed to remove ${userId}:`, error);
    return false;
  }
}

export async function restoreTelegramMember(userId: number): Promise<boolean> {
  try {
    await telegramApi("unbanChatMember", {
      chat_id: GROUP_ID,
      user_id: userId,
      only_if_banned: true,
    });
    return true;
  } catch (error) {
    console.error(`[telegram] failed to restore ${userId}:`, error);
    return false;
  }
}

export { GROUP_ID };
