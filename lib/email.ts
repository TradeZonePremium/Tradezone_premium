import nodemailer from "nodemailer";
import { Resend } from "resend";
import { formatDate } from "./dates";
import { planLabel } from "./plans";

// SERVER ONLY.
const siteUrl = () =>
  (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(body: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;background:#EEF3F1;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#10231F">
  <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:10px;padding:28px">
    ${body}
    <p style="margin:28px 0 0;color:#5b6b66;font-size:13px">
      Trade Zone Premium
    </p>
  </div>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<p style="margin:24px 0">
    <a
      href="${esc(href)}"
      style="background:#10231F;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:bold;display:inline-block"
    >
      ${esc(label)}
    </a>
  </p>`;
}

/**
 * Sends one email.
 *
 * Provider priority:
 * 1) SMTP_HOST -> SMTP via nodemailer
 * 2) RESEND_API_KEY -> Resend API
 */
async function send(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    console.error(
      "[email] EMAIL_FROM missing - email not sent to",
      to
    );
    return false;
  }

  try {
    if (process.env.SMTP_HOST) {
      const port = Number(process.env.SMTP_PORT || 465);

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      return true;
    }

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (error) {
        console.error("[email] Resend error:", error);
        return false;
      }

      return true;
    }

    console.error(
      "[email] No provider configured. Set SMTP_HOST or RESEND_API_KEY."
    );

    return false;
  } catch (e) {
    console.error("[email] send failed:", e);
    return false;
  }
}

/**
 * Generic sendEmail helper.
 */
export async function sendEmail(p: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const html = layout(
    `<p>${esc(p.text).replace(/\n/g, "<br/>")}</p>`
  );

  return send(p.to, p.subject, html);
}

/**
 * Telegram connection link.
 *
 * The token is the subscription join_token.
 *
 * Telegram will open:
 * https://t.me/TradeZonePremiumBot?start=<token>
 *
 * The bot receives /start <token> and links the
 * customer's Telegram User ID with their subscription.
 */
export function joinUrl(token: string): string {
  return `https://t.me/TradeZonePremiumBot?start=${encodeURIComponent(
    token
  )}`;
}

export function renewUrl(): string {
  return `${siteUrl()}/renew`;
}

/**
 * Payment success email.
 *
 * Sends the customer a personal Telegram connection link.
 */
export async function sendPaymentSuccessEmail(p: {
  to: string;
  name: string;
  plan: string;
  amount: number;
  startDate: string;
  expiryDate: string;
  joinToken: string;
}): Promise<boolean> {
  const firstName =
    p.name.trim().split(/\s+/)[0] || "there";

  const telegramLink = joinUrl(p.joinToken);

  const html = layout(`
    <h2 style="margin:0 0 16px">
      Welcome to Trade Zone!
    </h2>

    <p>
      Hi ${esc(firstName)},
    </p>

    <p>
      We are thrilled to have you in the community.
      Your membership is now active.
    </p>

    <p>
      <strong>Your access details:</strong>
    </p>

    <ul style="color:#5b6b66;line-height:1.6;padding-left:20px;">
      <li>
        <b>Membership:</b> ${esc(planLabel(p.plan))}
      </li>

      <li>
        <b>Valid until:</b> ${formatDate(p.expiryDate)}
      </li>
    </ul>

    <p>
      Click below to connect your Telegram account with
      your Trade Zone Premium membership:
    </p>

    ${button("Connect Telegram", telegramLink)}

    <p style="color:#5b6b66;font-size:13px">
      This is your personal Telegram connection link.
      Please do not share it with anyone else.
    </p>

    <p>
      After connecting Telegram, follow the instructions
      shown by the bot to continue with your community access.
    </p>

    <p>
      See you inside,<br/>
      The Trade Zone Team
    </p>
  `);

  return send(
    p.to,
    "Welcome to Trade Zone Premium! Your Telegram access",
    html
  );
}

/**
 * Subscription reminder email.
 */
export async function sendReminderEmail(p: {
  to: string;
  name: string;
  expiryDate: string;
  daysLeft: number;
}): Promise<boolean> {
  const firstName =
    p.name.trim().split(/\s+/)[0] || "there";

  const when =
    p.daysLeft <= 0
      ? "expires today"
      : p.daysLeft === 1
        ? "expires in 1 day"
        : `expires in ${p.daysLeft} days`;

  const html = layout(`
    <h2 style="margin:0 0 16px">
      Your subscription ${when}
    </h2>

    <p>
      Hi ${esc(firstName)},
    </p>

    <p>
      Your Trade Zone Premium subscription ${when}.
    </p>

    <p>
      <b>Expiry date:</b>
      ${formatDate(p.expiryDate)}
    </p>

    <p>
      Renew your subscription to keep your access.
      Renewing early does not waste any days:
      your new period starts after the current one ends.
    </p>

    ${button("Renew now", renewUrl())}
  `);

  return send(
    p.to,
    "Trade Zone Premium – Your subscription expires soon",
    html
  );
}

/**
 * Expired subscription email.
 */
export async function sendExpiredEmail(p: {
  to: string;
  name: string;
}): Promise<boolean> {
  const firstName =
    p.name.trim().split(/\s+/)[0] || "there";

  const html = layout(`
    <h2 style="margin:0 0 16px">
      Your subscription has expired
    </h2>

    <p>
      Hi ${esc(firstName)},
    </p>

    <p>
      Your Trade Zone Premium subscription has expired.
    </p>

    <p>
      Renew to continue your subscription and regain
      access to the community.
    </p>

    ${button("Renew now", renewUrl())}
  `);

  return send(
    p.to,
    "Trade Zone Premium – Subscription expired",
    html
  );
}