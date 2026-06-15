-- ============================================================
-- Heo & Masuri — Phase 2A: extend letters.kind enum
-- Adds new kinds used by the scheduled message infrastructure:
--   love_note  — Masuri-composed surprise note (manual)
--   surprise   — Masuri-composed surprise drop (shuffle-bag delivery)
--   gm         — daily good-morning auto-note
--   gn         — daily good-night auto-note
-- Preserves: weekly_letter, vocab_card, encouragement, two_truths.
-- Idempotent: safe to run twice.
-- ============================================================

do $$ begin
  alter table public.letters
    drop constraint if exists letters_kind_check;
  alter table public.letters
    add constraint letters_kind_check
    check (kind in (
      'weekly_letter',
      'vocab_card',
      'encouragement',
      'two_truths',
      'love_note',
      'surprise',
      'gm',
      'gn'
    ));
end $$;
