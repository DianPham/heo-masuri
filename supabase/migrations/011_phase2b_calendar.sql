-- ============================================================
-- Heo & Masuri — Phase 2B: self-hosted calendar
-- Blueprint §4.2 (first sub-section).
--
-- calendar_events             — both users' events (busy state + optional
--                               detail). Privacy is enforced server-side by
--                               the API visibility filter: when another user
--                               is fetching, title/note/emoji are stripped
--                               unless share_details=true.
-- recurring_schedule_template — Masuri's per-user weekly template, used to
--                               populate manual events forward.
--
-- RATIONALE (§4.2):
--   share_details defaults FALSE — surveillance-feeling avoidance.
--   template stored as minute-from-midnight ranges (jsonb 7-array of
--   [{start_minute, end_minute}]) so reapplying for new weeks stays trivial
--   and the structure is time-of-day-agnostic to date.
--
-- RLS: server-side anon SELECT (events visible across the pair so the
--      busy state shows for the other user) — the API does the
--      detail-stripping. Writes service-role only.
-- ============================================================

create table if not exists public.calendar_events (
  id             uuid primary key default gen_random_uuid(),
  owner          uuid not null references public.users(id),
  start_at       timestamptz not null,
  end_at         timestamptz not null,
  title          text,                              -- nullable: many events are "just busy"
  note           text,
  emoji          text,
  source         text not null default 'manual'
                   check (source in ('manual','recurring_template','date','quick_block')),
  source_ref     uuid,                              -- FK enforced by app per source value
  share_details  boolean not null default false,    -- if true, partner sees title/note/emoji
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  constraint chk_end_after_start check (end_at > start_at)
);

create index if not exists calendar_events_owner_start_idx
  on public.calendar_events (owner, start_at);
create index if not exists calendar_events_owner_range_idx
  on public.calendar_events (owner, start_at, end_at);

-- Update timestamp trigger
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_calendar_events_touch on public.calendar_events;
create trigger trg_calendar_events_touch
  before update on public.calendar_events
  for each row execute function public.touch_updated_at();

alter table public.calendar_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read events' and tablename = 'calendar_events') then
    create policy "anon read events" on public.calendar_events for select to anon using (true);
  end if;
end $$;
grant select on public.calendar_events to anon;

-- ── recurring_schedule_template ──────────────────────────────────────────────
-- One row per user. template column is a 7-element JSON array (Mon=0 … Sun=6),
-- each element is an array of {start_minute, end_minute} ranges in [0,1440].
create table if not exists public.recurring_schedule_template (
  user_id     uuid primary key references public.users(id),
  template    jsonb not null default '[[],[],[],[],[],[],[]]'::jsonb,
  enabled     boolean not null default false,
  updated_at  timestamptz default now()
);

drop trigger if exists trg_template_touch on public.recurring_schedule_template;
create trigger trg_template_touch
  before update on public.recurring_schedule_template
  for each row execute function public.touch_updated_at();

alter table public.recurring_schedule_template enable row level security;
-- No anon policy: template content is server-only.
