-- Run this whole file in: Supabase Dashboard -> SQL Editor -> New query -> Run

create extension if not exists "pgcrypto";

-- One row per customer. Renewals UPDATE this same row.
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid,                       -- Supabase auth user (set after email OTP)
  name                text not null,
  email               text not null unique,
  whatsapp_number     text not null,              -- saved only, never verified
  plan                text,                       -- '1M' | '2M' | '3M' (latest paid plan)
  amount              integer,                    -- rupees, latest paid amount
  razorpay_order_id   text,                       -- latest paid order
  razorpay_payment_id text,                       -- latest paid payment
  start_date          date,
  expiry_date         date,
  status              text not null default 'PENDING'
                      check (status in ('PENDING','ACTIVE','EXPIRED')),
  join_token          uuid not null unique default gen_random_uuid(),
  reminder_sent       boolean not null default false,
  expired_email_sent  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Every payment attempt / payment (history + revenue + idempotency)
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  subscription_id     uuid not null references public.subscriptions(id) on delete cascade,
  razorpay_order_id   text not null unique,
  razorpay_payment_id text,
  plan                text not null,
  amount              integer not null,           -- rupees
  status              text not null default 'CREATED'
                      check (status in ('CREATED','PAID')),
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

create index if not exists subscriptions_status_expiry_idx
  on public.subscriptions (status, expiry_date);
create index if not exists payments_subscription_idx
  on public.payments (subscription_id);

-- Security: turn on Row Level Security and add NO policies.
-- Browser (anon key) can read/write nothing. Only our server API routes,
-- which use the service-role key, can touch these tables.
alter table public.subscriptions enable row level security;
alter table public.payments      enable row level security;
