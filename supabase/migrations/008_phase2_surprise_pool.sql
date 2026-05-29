-- ============================================================
-- Heo & Masuri — Phase 2A: surprise pool + shuffle-bag bookkeeping
-- Blueprint §4.1.
--
-- surprise_pool        — Masuri's pre-written surprise messages
-- surprise_deliveries  — bookkeeping for shuffle-bag state (which items
--                        have been delivered in the current round)
--
-- RATIONALE: surprise_deliveries is separate from letters because we need
-- to track shuffle-bag state (current round, which items used) without
-- mixing that concern into the generic letters table. The letters row is
-- the user-visible delivery; surprise_deliveries is the bookkeeping.
--
-- RLS: both tables service-role only — no anon policies.
-- ============================================================

create table if not exists public.surprise_pool (
  id           uuid primary key default gen_random_uuid(),
  body         text not null,
  language     text not null default 'vi' check (language in ('vi','en','mixed')),
  weight       int not null default 1,        -- shuffle-bag multiplier (higher = picked more often)
  attachments  jsonb,                          -- optional image URL, link, etc.
  author       uuid not null references public.users(id),
  created_at   timestamptz default now(),
  retired_at   timestamptz                     -- if set, never delivered again
);
create index if not exists surprise_pool_active_idx
  on public.surprise_pool (retired_at, created_at desc);

create table if not exists public.surprise_deliveries (
  id            uuid primary key default gen_random_uuid(),
  pool_id       uuid not null references public.surprise_pool(id),
  letter_id     uuid not null references public.letters(id),
  delivered_at  timestamptz not null default now(),
  shuffle_round int not null
);
create index if not exists surprise_deliveries_pool_idx
  on public.surprise_deliveries (pool_id, delivered_at desc);
create index if not exists surprise_deliveries_round_idx
  on public.surprise_deliveries (shuffle_round, delivered_at desc);

-- RLS: enable but add no anon policies (service-role only access).
alter table public.surprise_pool enable row level security;
alter table public.surprise_deliveries enable row level security;
