# Trade Zone Premium – Updated Project

## Main changes

1. Telegram membership is now the primary community-access flow.
2. `/start <join_token>` validates an active subscription, links the Telegram account, and automatically generates a one-member private-group invite.
3. Expiry cron now marks subscriptions expired and removes linked Telegram members.
4. Expiry notifications are sent by email and, when linked, Telegram.
5. Renewal restores a previously banned Telegram member and sends a fresh one-member invite.
6. Reminder cron supports Telegram reminders in addition to email.
7. Email OTP input accepts Supabase OTP lengths from 6 to 10 digits, matching the current project behavior.
8. Email links use `NEXT_PUBLIC_SITE_URL` consistently.
9. Admin API uses `ADMIN_EMAILS` consistently.
10. Removed temporary payment debug logging.
11. Admin dashboard now shows Telegram connection status instead of WhatsApp contact data.
12. Removed obsolete WhatsApp OTP/webhook/join-flow files.
13. Updated `supabase/schema.sql` with nullable WhatsApp field and `telegram_user_id`.
14. `.env.local`, `.git`, `.next`, and `node_modules` are intentionally excluded from the delivery ZIP.

## Important

Before production deployment, set the required environment variables from `.env.example`. Do not commit `.env.local` or expose any secret keys.

## Validation

TypeScript check passed with `tsc --noEmit` after removing the old generated `.next` files. A full Next.js build could not be completed in this isolated environment because Next.js attempted to download its SWC binary from npm and outbound DNS/network access was unavailable.
