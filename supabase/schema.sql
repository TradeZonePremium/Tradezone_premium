-- Trade Zone Premium database schema
-- Safe to run on the existing project.

create extension if not exists "pgcrypto";

create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid,
  name                text not null,
  email               text not null unique,
  whatsapp_number     text,
  telegram_user_id    bigint,
  plan                text,
  amount              integer,
  razorpay_order_id   text,
  razorpay_payment_id text,
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

-- Existing deployments: add the Telegram column if it is not present.
alter table public.subscriptions
  add column if not exists telegram_user_id bigint;

-- Existing deployments may still have whatsapp_number marked NOT NULL.
alter table public.subscriptions
  alter column whatsapp_number drop not null;

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  subscription_id     uuid not null references public.subscriptions(id) on delete cascade,
  razorpay_order_id   text not null unique,
  razorpay_payment_id text,
  plan                text not null,
  amount              integer not null,
  status              text not null default 'CREATED'
                      check (status in ('CREATED','PAID')),
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

create index if not exists subscriptions_status_expiry_idx
  on public.subscriptions (status, expiry_date);
create index if not exists subscriptions_telegram_idx
  on public.subscriptions (telegram_user_id);
create index if not exists payments_subscription_idx
  on public.payments (subscription_id);

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
