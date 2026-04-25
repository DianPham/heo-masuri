-- ============================================================
-- Heo & Masuri — Seed the two users
-- Run this AFTER 001_initial_schema.sql
-- ============================================================

insert into public.users (slug, display_name, full_name, pronoun, timezone) values
  ('masuri', 'Masuri', 'Dân',    'he/him',   'Asia/Ho_Chi_Minh'),
  ('heo',    'Heo',    'Phương', 'she/her',  'Asia/Ho_Chi_Minh');

-- Seed default notification prefs for both users
insert into public.notification_prefs (user_id, missing_enabled, thinking_enabled, hug_kiss_enabled, angry_enabled)
select id, true, true, true, true from public.users;
