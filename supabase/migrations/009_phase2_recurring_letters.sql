-- ============================================================
-- Heo & Masuri — Phase 2A: recurring letter schedules (GM/GN)
-- Blueprint §4.1.
--
-- One row per active recurring schedule. The cron tick reads this table
-- to decide what GM/GN auto-note (if any) to deliver right now.
--
-- RATIONALE: GM/GN content rotates rather than shuffles. The same
-- "Good morning Heo 💕" the same morning is fine; the variation is
-- "Good morning Heo 💕" today vs. "Chào buổi sáng Heo 🌸" tomorrow.
-- Rotation is more predictable than shuffle-bag for daily content.
--
-- RLS: service-role only — no anon policies.
-- ============================================================

create table if not exists public.recurring_letters (
  id                uuid primary key default gen_random_uuid(),
  from_user         uuid not null references public.users(id),
  to_user           uuid not null references public.users(id),
  kind              text not null check (kind in ('gm','gn')),
  pool              jsonb not null,                      -- array of body strings to rotate through
  send_at_local     time not null,                        -- 07:00 for GM, 22:00 for GN typically
  timezone          text not null default 'Asia/Ho_Chi_Minh',
  enabled           boolean not null default true,
  last_delivered_at timestamptz,
  last_pool_index   int not null default -1,              -- rotates through pool in order; reshuffles at end
  created_at        timestamptz default now()
);

create unique index if not exists recurring_letters_unique_kind_per_pair
  on public.recurring_letters (from_user, to_user, kind);

alter table public.recurring_letters enable row level security;
