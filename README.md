# Trade Zone Premium

Next.js + Supabase (email OTP + database) + Razorpay (payments) + Resend (emails).

Flow: register → verify email with OTP → pay with Razorpay → server verifies payment → subscription
activated → confirmation email with a masked WhatsApp link → daily job sends the 3-day reminder and
marks expired subscriptions.

---

## 1. Run it on your computer

You need **Node.js 20 or newer** (https://nodejs.org, choose LTS). Check with `node -v`.

1. Open this folder in VS Code (**File → Open Folder**).
2. Open the terminal in VS Code (**Terminal → New Terminal**) and run:
   ```
   npm install
   ```
3. Create your env file. Copy `.env.example` to `.env.local`:
   - Windows PowerShell: `copy .env.example .env.local`
   - Mac/Linux: `cp .env.example .env.local`

   Then open `.env.local` and fill in the values (see the sections below).
4. Start the app:
   ```
   npm run dev
   ```
   Open http://localhost:3000

Restart `npm run dev` every time you change `.env.local`.

> Keep keys in `.env.local` only. Never paste them in chat, screenshots or GitHub.
> `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET` are server-only.

---

## 2. Supabase

1. **Keys:** Project Settings → API. Copy *Project URL*, *anon public* key and *service_role* key into `.env.local`.
2. **Tables:** SQL Editor → New query → paste everything from `supabase/schema.sql` → Run.
   (Row Level Security is enabled with no policies, so the browser cannot read the tables. Only the server can.)
3. **Enable email OTP:** Authentication → Providers → Email → enable it.
4. **Show the code in the email:** Authentication → Emails (Templates). Paste the body from
   `supabase/email-otp-template.html` into **both** "Confirm signup" and "Magic Link"
   (new customers get the first, returning customers the second). It must contain `{{ .Token }}`.
5. **Custom SMTP (do this before real customers):** Supabase's built-in sender allows only a handful of
   emails per hour. Project Settings → Authentication → SMTP Settings → use Resend's SMTP:
   host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key,
   sender = an address on your verified domain.

## 3. Resend (payment / reminder / expiry emails)

1. Create an API key → `RESEND_API_KEY`.
2. Verify your domain in Resend → set `EMAIL_FROM="Trade Zone Premium <noreply@your-domain.com>"`.
   For a quick test you can use `onboarding@resend.dev`, but it only delivers to your own Resend account email.

## 4. Razorpay

1. Dashboard → **Test mode** → Account & Settings → API Keys → Generate.
   Put the Key ID in `NEXT_PUBLIC_RAZORPAY_KEY_ID` and the Key Secret in `RAZORPAY_KEY_SECRET`.
2. Keep payment capture on **Automatic** (Settings → Payment Capture).
3. **Webhook (backup if a customer closes the tab right after paying):**
   Account & Settings → Webhooks → Add new webhook
   - URL: `https://YOUR-DOMAIN/api/webhooks/razorpay`
   - Secret: the same random string as `RAZORPAY_WEBHOOK_SECRET`
   - Event: `payment.captured`

   Razorpay cannot reach `localhost`. To test the webhook locally use a tunnel such as
   `ngrok http 3000` and use the ngrok URL. The normal flow works on localhost without the webhook.

**Test payment:** card `4111 1111 1111 1111`, any future expiry, any CVV, any OTP.
UPI test ID: `success@razorpay` (failure test: `failure@razorpay`).

## 5. WhatsApp link

- Put the real group invite link in `WHATSAPP_INVITE_URL`. It is never shown on the site or in emails.
  Emails contain `https://your-domain/join?token=...`, which redirects only ACTIVE subscribers.
- In the WhatsApp group: Group info → Group settings → **Approve new participants → On**.
  Then even if a link is forwarded, nobody enters without approval. Match the join request against the
  WhatsApp number shown in `/admin`.
- To rotate the link: Group info → Invite via link → Reset link, then update `WHATSAPP_INVITE_URL`.

## 6. Admin dashboard

Set `ADMIN_EMAILS=rohan@example.com` (comma-separated for more). Open `/admin`, sign in with that email
and the OTP. Shows customers, active, expiring in 3 days, expired, revenue, with search and filter.

## 7. Daily job (reminders + expiry)

`vercel.json` runs `/api/cron/daily` every day at 09:00 IST (03:30 UTC). It:
- emails subscribers whose expiry is within 3 days (once per subscription period),
- marks `expiry_date < today` as `EXPIRED` and emails them.

Set `CRON_SECRET` (any long random string). Vercel sends it automatically. Test it by hand:
```
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/daily
```
Windows PowerShell:
```
curl.exe -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/daily
```
To test reminders quickly, edit a test customer's `expiry_date` in Supabase (Table Editor) to 3 days from
today (and `reminder_sent` = false), then call the URL above.

---

## Testing checklist (test mode)

1. Home page: fill name, WhatsApp, pick a plan, enter email → **Send OTP** → enter code → **Verify OTP**.
2. **Continue to payment** → pay with the test card.
3. Check Supabase → `subscriptions`: status `ACTIVE`, correct start/expiry. `payments`: status `PAID`.
4. Check your inbox for the confirmation email → click **Join WhatsApp group** → lands on the invite link.
5. Open `/renew` (same email) → renew → expiry moves forward from the *old expiry* (19 Oct → 19 Nov).
6. Set expiry to yesterday in Supabase → run the cron URL → status becomes `EXPIRED`, email sent, `/join` link now sends the person to `/renew`.

## Go live checklist

- Swap to **live** Razorpay keys (`rzp_live_...`) and create the webhook in live mode.
- Deploy to Vercel (import the repo, add every variable from `.env.local` in Project Settings → Environment Variables).
  Set `NEXT_PUBLIC_SITE_URL` to your real domain.
- Custom SMTP + verified Resend domain (steps above).
- WhatsApp "Approve new participants" turned on.
- Do one real ₹ payment yourself end to end.

## How the money side is protected

- Prices live only in `lib/plans.ts` on the server. The browser sends a plan name, never an amount.
- The browser never decides a payment succeeded. `/api/orders/verify` checks Razorpay's HMAC signature,
  and the webhook checks Razorpay's webhook signature.
- Activation is **idempotent** (`lib/activate.ts`): a payment is claimed once, so the verify call and the
  webhook can both fire without extending the subscription twice.
- Renewal: new expiry = later of (old expiry, today) + plan months.

## Project map

```
app/page.tsx                    home + registration
app/renew/page.tsx              renewal (linked from reminder emails)
app/admin/page.tsx              admin dashboard
app/join/route.ts               masked WhatsApp redirect
app/api/orders/create           creates Razorpay order (server-side price)
app/api/orders/verify           verifies signature, activates subscription
app/api/webhooks/razorpay       backup activation
app/api/cron/daily              reminders + expiry
app/api/me, app/api/admin/data  data for /renew and /admin
lib/plans.ts                    plans and prices
lib/activate.ts                 shared, idempotent activation
lib/email.ts                    email templates (Resend)
supabase/schema.sql             database tables
```

## Not included

- Automatic add/remove of WhatsApp group members (not assumed possible with the Cloud API; verify before building).
- Rate limiting on the API routes beyond what Supabase applies to OTP emails.
