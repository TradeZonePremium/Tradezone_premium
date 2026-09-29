const GRAPH_API_VERSION = "v23.0";

export async function sendPremiumGroupInvite(to: string, groupLink?: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_INVITE_TEMPLATE_NAME;
  const language = process.env.WHATSAPP_INVITE_TEMPLATE_LANGUAGE || "en";

  if (!phoneNumberId || !accessToken || !templateName) {
    throw new Error("WhatsApp invite configuration is missing.");
  }

  const recipient = to.replace(/\D/g, "");

  if (recipient.length < 10 || recipient.length > 15) {
    throw new Error("Invalid WhatsApp recipient number.");
  }

  // Build template body components if a group link is provided
  const components = groupLink
    ? [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: groupLink,
            },
          ],
        },
      ]
    : undefined;

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: language,
          },
          ...(components && { components }),
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("[WhatsApp invite] Meta API error:", data);
    throw new Error(
      data?.error?.message || "WhatsApp invitation could not be sent."
    );
  }

  console.log("[WhatsApp invite] sent:", {
    to: recipient,
    messageId: data?.messages?.[0]?.id,
  });

  return data;
}
