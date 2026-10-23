-- ============================================================
-- Heo & Masuri — finish the vocabulary per-language uniqueness change
-- Run AFTER the Chinese-track code (which upserts on (user_id, lang, word_en))
-- is deployed to this environment. Before that, the old code still needs
-- this constraint. Safe to run multiple times.
-- ============================================================
alter table public.vocabulary drop constraint if exists vocabulary_user_word_unique;
