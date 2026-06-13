-- Phase 2C / CP10 — convert scheduled_dates.calendar_event_id FK to ON DELETE SET NULL.
-- CP9 created the FK with default NO ACTION which would block calendar_events deletes;
-- CP10 wants deleting a calendar event to just orphan the scheduled_date, not block.

alter table public.scheduled_dates
  drop constraint if exists scheduled_dates_calendar_event_id_fkey;

alter table public.scheduled_dates
  add constraint scheduled_dates_calendar_event_id_fkey
  foreign key (calendar_event_id) references public.calendar_events(id) on delete set null;
