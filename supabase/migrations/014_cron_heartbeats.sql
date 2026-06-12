-- Phase 2 / observability — cron_heartbeats.
--
-- One row per cron worker name; updated whenever the dispatcher invokes it.
-- Lets us answer "is the cron-job.org pinger still firing?" with a single
-- SQL query instead of digging through Vercel logs.

create table public.cron_heartbeats (
  name        text primary key,
  fired_at    timestamptz not null default now(),
  payload     jsonb        -- last result summary, useful for debugging
);

alter table public.cron_heartbeats enable row level security;
-- No anon policies — service role only.
