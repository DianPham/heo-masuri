-- Phase 2D fix pass — flip share_details default to true.
-- Dân decided privacy default was wrong for this couple PWA: the partner not
-- knowing what a busy block IS is more annoying than valuable. Going forward
-- every new calendar_events row defaults to share_details=true; existing rows
-- stay as-is so we don't surprise anyone with retroactive exposure.

alter table public.calendar_events
  alter column share_details set default true;
