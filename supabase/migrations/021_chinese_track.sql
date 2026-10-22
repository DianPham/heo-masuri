-- ============================================================
-- Heo & Masuri — Chinese (Mandarin) track for daily lessons
-- Run in the Supabase SQL editor (staging first, then prod),
-- BEFORE deploying the code that reads these columns. Additive only, so the
-- currently deployed code keeps working. Safe to run multiple times.
--
-- Model: every daily page can be studied in English (`cards`, the
-- original track) or Chinese (`cards_zh`). Heo picks one to start;
-- the other stays available to learn later.
--   completed_at     — first completion in ANY language. Drives streak,
--                      carry-over, scrapbook and the publish-due gate,
--                      exactly as before.
--   completed_en_at  — completion of the English track.
--   completed_zh_at  — completion of the Chinese track.
-- ============================================================

-- ── daily_pages: Chinese track + per-language completion ────
alter table public.daily_pages add column if not exists title_zh        text;
alter table public.daily_pages add column if not exists cards_zh        jsonb;
alter table public.daily_pages add column if not exists completed_en_at timestamptz;
alter table public.daily_pages add column if not exists completed_zh_at timestamptz;

-- Every lesson completed before this migration was completed in English.
update public.daily_pages
  set completed_en_at = completed_at
  where completed_at is not null
    and completed_en_at is null;

-- Backfill worklist: non-archived pages still missing a Chinese track.
create index if not exists daily_pages_missing_zh_idx
  on public.daily_pages (for_user, scheduled_for)
  where cards_zh is null and status != 'archived';

-- ── vocabulary: language + pinyin ───────────────────────────
-- `word_en` keeps its name for back-compat but holds the headword in the
-- row's language: an English word when lang='en', hanzi when lang='zh'.
alter table public.vocabulary add column if not exists lang text not null default 'en';
alter table public.vocabulary add column if not exists pinyin text;

do $$ begin
  alter table public.vocabulary
    add constraint vocabulary_lang_check check (lang in ('en','zh'));
exception when duplicate_object then
  null;
end $$;

-- Uniqueness is now per language: (user_id, lang, word_en).
-- The old (user_id, word_en) constraint stays for now: the code deployed
-- before this release upserts against it. Drop it with 023 once the new code
-- is live in this environment.
do $$ begin
  alter table public.vocabulary
    add constraint vocabulary_user_lang_word_unique unique (user_id, lang, word_en);
exception when duplicate_object or duplicate_table then
  null;
end $$;

create index if not exists vocabulary_user_lang_saved_idx
  on public.vocabulary (user_id, lang, saved_at desc);

-- Table-level grants from 004/020 already cover the new columns.
-- Done.
