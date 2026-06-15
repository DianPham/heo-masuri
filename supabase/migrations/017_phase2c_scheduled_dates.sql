-- Phase 2C / CP9 — scheduled_dates. Blueprint §4.3.
-- CP9 introduces the table; CP10 adds calendar_event_id wiring + dress code attachment.

create table public.scheduled_dates (
  id                uuid primary key default gen_random_uuid(),
  created_by        uuid not null references public.users(id),
  start_at          timestamptz not null,
  end_at            timestamptz not null,
  title             text,
  dress_code        text,
  dress_code_emoji  text,
  outline_template  uuid references public.date_outline_templates(id),
  outline_snapshot  jsonb,
  itinerary         jsonb,
  flipped_at        timestamptz,
  calendar_event_id uuid references public.calendar_events(id),
  status            text not null default 'planning'
                      check (status in ('planning','ready','done','cancelled')),
  created_at        timestamptz default now(),
  constraint chk_scheduled_dates_end_after_start check (end_at > start_at)
);
create index scheduled_dates_status_start_idx on public.scheduled_dates (status, start_at);
create index scheduled_dates_created_by_idx on public.scheduled_dates (created_by, created_at desc);

alter table public.scheduled_dates enable row level security;
create policy "anon read scheduled dates" on public.scheduled_dates
  for select to anon using (true);

-- Backfill the FK reference deferred from CP8: now that scheduled_dates exists,
-- attach outfit_suggestions.date_id to it.
alter table public.outfit_suggestions
  add constraint outfit_suggestions_date_id_fkey
  foreign key (date_id) references public.scheduled_dates(id) on delete set null;
