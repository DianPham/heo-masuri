-- ============================================================
-- Heo & Masuri — Phase 2: notification_prefs additions
-- Blueprint §4.4.
--
-- Adds toggles for the five new Phase 2 push channels:
--   surprise_enabled       — Masuri's surprise drops
--   gmgn_enabled           — daily GM / GN auto-notes
--   date_planning_enabled  — date scheduled / outfit suggested
--   outfit_enabled         — outfit suggestions specifically
--   important_date_enabled — important-date occurrence reminders
--
-- All default true. Existing rows get the default automatically.
-- Idempotent: safe to run twice.
-- ============================================================

alter table public.notification_prefs
  add column if not exists surprise_enabled       boolean not null default true,
  add column if not exists gmgn_enabled           boolean not null default true,
  add column if not exists date_planning_enabled  boolean not null default true,
  add column if not exists outfit_enabled         boolean not null default true,
  add column if not exists important_date_enabled boolean not null default true;
