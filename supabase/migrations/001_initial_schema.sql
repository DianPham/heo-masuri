-- ============================================================
-- Heo & Masuri — Phase 1 initial schema
-- Run this in the Supabase SQL editor (Singapore region).
-- ============================================================

-- ── users ────────────────────────────────────────────────────
create table public.users (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  display_name text not null,
  full_name    text not null,
  pronoun      text not null,
  timezone     text not null default 'Asia/Ho_Chi_Minh',
  created_at   timestamptz default now()
);

-- ── missing_signals ──────────────────────────────────────────
create table public.missing_signals (
  id              uuid primary key default gen_random_uuid(),
  from_user       uuid not null references public.users(id),
  intensity       smallint not null check (intensity in (1, 2, 3)),
  acknowledged_at timestamptz,
  created_at      timestamptz default now()
);
create index on public.missing_signals (created_at desc);

-- ── thinking_pings ───────────────────────────────────────────
create table public.thinking_pings (
  id        uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.users(id),
  to_user   uuid not null references public.users(id),
  kind      text not null check (kind in ('thinking', 'hug', 'kiss')),
  seen_at   timestamptz,
  created_at timestamptz default now()
);
create index on public.thinking_pings (to_user, seen_at, created_at desc);

-- ── angry_buzzes ─────────────────────────────────────────────
-- IMPORTANT: This table is NEVER queried for display in the UI.
-- No history view anywhere. Discord receives the realtime signal;
-- DB row is for closed-loop state only (so resolve knows which row to update).
create table public.angry_buzzes (
  id             uuid primary key default gen_random_uuid(),
  from_user      uuid not null references public.users(id),
  need_type      text not null check (need_type in ('space', 'presence', 'vent', 'fix')),
  context_note   text,
  resolved_at    timestamptz,
  dan_reply      text check (dan_reply in ('sorry', 'on_my_way', 'talk_in_10', 'heard_you')),
  dan_replied_at timestamptz,
  created_at     timestamptz default now()
);
create index on public.angry_buzzes (resolved_at, created_at desc);

-- ── reunion_dates ────────────────────────────────────────────
create table public.reunion_dates (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  label_en    text,
  target_date date not null,
  is_current  boolean not null default true,
  created_at  timestamptz default now()
);

-- ── push_subscriptions ───────────────────────────────────────
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id),
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz default now()
);

-- ── notification_prefs ───────────────────────────────────────
create table public.notification_prefs (
  user_id          uuid primary key references public.users(id),
  missing_enabled  boolean default true,
  thinking_enabled boolean default true,
  hug_kiss_enabled boolean default true,
  angry_enabled    boolean default true,
  quiet_start      time,
  quiet_end        time,
  updated_at       timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users              enable row level security;
alter table public.missing_signals    enable row level security;
alter table public.thinking_pings     enable row level security;
alter table public.angry_buzzes       enable row level security;
alter table public.reunion_dates      enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;

-- anon can read users, thinking_pings, missing_signals, reunion_dates
create policy "anon read users"
  on public.users for select to anon using (true);

create policy "anon read thinking_pings"
  on public.thinking_pings for select to anon using (true);

create policy "anon read missing_signals"
  on public.missing_signals for select to anon using (true);

create policy "anon read reunion_dates"
  on public.reunion_dates for select to anon using (true);

-- angry_buzzes, push_subscriptions, notification_prefs: NO anon access.
-- All writes to all tables happen via API routes using service_role key.
