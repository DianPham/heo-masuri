-- ============================================================
-- Heo & Masuri — Explicit anon grants
--
-- Required when Supabase project was created with
-- "Automatically expose new tables" DISABLED.
--
-- Run this in the Supabase SQL editor if you already ran
-- 001_initial_schema.sql without these grants.
-- ============================================================

-- Allow the anon role to reach the public schema at all
grant usage on schema public to anon;

-- Tables the client (anon key + Supabase Realtime) is allowed to read
grant select on public.users              to anon;
grant select on public.missing_signals    to anon;
grant select on public.thinking_pings     to anon;
grant select on public.reunion_dates      to anon;

-- angry_buzzes, push_subscriptions, notification_prefs:
-- NO grant to anon. Server-only via service_role.

-- service_role needs full access to all tables (may not be automatic
-- if the project was created without "Expose schema" enabled)
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
