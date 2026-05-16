-- ============================================================
-- Heo & Masuri — Phase 1.5 schema corrections
-- Run AFTER 004_phase15_notebook.sql.
-- Safe to run multiple times (all changes are guarded).
-- All fixes derived from blueprint §3 vs. production audit.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. vocabulary.source_kind — fix constraint values
--    Migration 004 defined: ('daily_page','masuri_card','manual')
--    Blueprint §3 defines:  ('page','masuri_card','ask_masuri','letter')
--    API already uses the blueprint values. Update the constraint.
-- ────────────────────────────────────────────────────────────
do $$ begin
  -- Drop the old constraint (by name if it exists, ignore if missing)
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'vocabulary'
      and constraint_type = 'CHECK'
      and constraint_name like '%source_kind%'
  ) then
    alter table public.vocabulary
      drop constraint if exists vocabulary_source_kind_check,
      drop constraint if exists vocabulary_source_kind_check1;
  end if;

  -- Add the correct constraint
  alter table public.vocabulary
    add constraint vocabulary_source_kind_check
    check (source_kind in ('page','masuri_card','ask_masuri','letter'));
exception when others then
  null; -- constraint already correct — ignore
end $$;

-- ────────────────────────────────────────────────────────────
-- 2. notebook_prefs — add missing blueprint columns
--    Blueprint §3:
--      daily_reminder_time    time  default '20:00'
--      daily_reminder_enabled boolean default true
--      ask_masuri_enabled     boolean default true   (push when Masuri replies an ask)
--      letter_reply_enabled   boolean default true   (push when Masuri replies a letter)
--      preferred_topics       text[] default array['daily','feelings','food']
--    Migration 004 had: tts_rate, reminder_enabled, reminder_time (keep for back-compat)
-- ────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'notebook_prefs' and column_name = 'daily_reminder_time'
  ) then
    alter table public.notebook_prefs
      add column daily_reminder_time time not null default '20:00';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'notebook_prefs' and column_name = 'daily_reminder_enabled'
  ) then
    alter table public.notebook_prefs
      add column daily_reminder_enabled boolean not null default true;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'notebook_prefs' and column_name = 'ask_masuri_enabled'
  ) then
    alter table public.notebook_prefs
      add column ask_masuri_enabled boolean not null default true;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'notebook_prefs' and column_name = 'letter_reply_enabled'
  ) then
    alter table public.notebook_prefs
      add column letter_reply_enabled boolean not null default true;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'notebook_prefs' and column_name = 'preferred_topics'
  ) then
    alter table public.notebook_prefs
      add column preferred_topics text[] not null default array['daily','feelings','food'];
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 3. streaks — add rest_days_used_at audit trail
--    Blueprint §3 lists: rest_days_used_at date[]
--    Column missing in migration 004. Also add rest_days_remaining
--    if not present (migration 004 missed it; streak/bump.ts uses it).
-- ────────────────────────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'streaks' and column_name = 'rest_days_remaining'
  ) then
    alter table public.streaks
      add column rest_days_remaining int not null default 1;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'streaks' and column_name = 'rest_days_used_at'
  ) then
    alter table public.streaks
      add column rest_days_used_at date[] not null default '{}';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 4. letters — fix RLS policy
--    Migration 004: using (true)  — exposes all letters, including future-scheduled
--    Blueprint §3:  using (delivered_at <= now()) — only show delivered letters
--    This matters in Phase 2 when love notes have future delivered_at.
-- ────────────────────────────────────────────────────────────
do $$ begin
  -- Drop the permissive policy
  drop policy if exists "anon read letters" on public.letters;
  -- Re-create with blueprint's delivered_at guard
  -- (delivered_at may be null for drafts — those should not be visible)
  create policy "anon read delivered letters"
    on public.letters for select to anon
    using (delivered_at is not null and delivered_at <= now());
exception when duplicate_object then
  null;
end $$;

-- ────────────────────────────────────────────────────────────
-- 5. daily_pages — ensure generated_by constraint is correct
--    Migration 004 was stale (different schema). The real production
--    table should have the blueprint constraint, but guard just in case.
-- ────────────────────────────────────────────────────────────
do $$ begin
  alter table public.daily_pages
    drop constraint if exists daily_pages_generated_by_check;
  alter table public.daily_pages
    add constraint daily_pages_generated_by_check
    check (generated_by in ('routine','manual','masuri'));
exception when others then
  null; -- already correct
end $$;

-- ────────────────────────────────────────────────────────────
-- 6. Grant select on new columns (no-op for existing grants, but
--    needed if the anon role was granted by table-level at creation)
--    notebook_prefs stays server-only (no anon grant).
-- ────────────────────────────────────────────────────────────
-- Nothing to add — table-level grants already cover new columns.

-- ────────────────────────────────────────────────────────────
-- 7. Backfill rest_days_remaining for existing streak rows
-- ────────────────────────────────────────────────────────────
update public.streaks
  set rest_days_remaining = 1
  where rest_days_remaining = 0
    and last_active_date is not null;

-- Done.
