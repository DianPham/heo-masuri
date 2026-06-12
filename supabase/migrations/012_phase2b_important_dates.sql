-- Phase 2B / CP6 — important_dates (blueprint §4.2, §6.7).
--
-- Generalizes reunion_dates into a single table covering reunion, anniversary,
-- monthiversary, birthdays, and arbitrary "other" dates. Yearly/monthly
-- recurrences computed on the fly (no row-per-occurrence).
--
-- reunion_dates is NOT dropped here — kept as fallback during Phase 2 rollout.
-- A follow-up migration after the reveal can drop it.

create table public.important_dates (
  id              uuid primary key default gen_random_uuid(),
  label_vi        text not null,
  label_en        text not null,
  target_date     date not null,
  kind            text not null check (kind in (
    'reunion',
    'anniversary',
    'monthiversary',
    'birthday_heo',
    'birthday_masuri',
    'other'
  )),
  recurrence      text not null default 'none'
                    check (recurrence in ('none','yearly','monthly')),
  is_current      boolean not null default true,
  emoji           text,
  show_on_home    boolean not null default true,
  created_at      timestamptz default now()
);
create index important_dates_kind_target_idx on public.important_dates (kind, target_date);
create index important_dates_home_idx on public.important_dates (target_date) where show_on_home = true;

-- Import existing reunion_dates rows. reunion_dates uses `label` (NOT label_vi).
-- (Blueprint INSERT has a typo — corrected here.)
insert into public.important_dates
  (label_vi, label_en, target_date, kind, recurrence, is_current, emoji, show_on_home, created_at)
select
  coalesce(label, 'Ngày đoàn tụ'),
  coalesce(label_en, 'Reunion day'),
  target_date,
  'reunion',
  'none',
  is_current,
  '💕',
  true,
  created_at
from public.reunion_dates;

alter table public.important_dates enable row level security;
create policy "anon read important dates" on public.important_dates
  for select to anon using (true);
-- Writes service-role only (no insert/update/delete policies for anon).
