# Pre-written Chinese tracks for production lessons

One file per existing lesson (`<scheduled_for>_<page id>.json`), shaped exactly
like the body of `POST /api/notebook/routine/zh-backfill`:
`{ "page_id", "title_zh", "cards_zh" }`.

Written 2026-10-23 from the 31 non-archived production lessons (25 completed,
the unfinished 2026-07-01 lesson, 5 queued drafts): course-wide vocabulary plan
(127 new words, none repeated as "new", 53 with Hán Việt), then per-lesson
writing, an independent native-level review (49 issues fixed), and a
course-wide consistency pass (20 issues fixed). Every file passes the server's
`validateZhCards`.

Upload with `scripts/routine/upload_zh_backfill.sh <app url>` once the app runs
the Chinese-track code on a database with migrations 021/022 applied. Safe to
re-run: lessons that already have a Chinese track answer 409.
