# Chinese track + natural-voice audio — rollout

Every daily lesson can now be studied in **English** (`daily_pages.cards`) or
**Chinese** (`daily_pages.cards_zh`, Mandarin, simplified + pinyin + Hán Việt).
Heo picks the language when she opens a lesson; finishing either one completes
the lesson for the day (streak, carry-over and publish-due unchanged), and the
other language stays open — from the home tile, the completion card, or the
scrapbook (polaroids show 🇬🇧 ✓ / 🇨🇳 Học).

Pronunciation now comes from Microsoft Edge's free neural voices (Ava for
English, Xiaoxiao for Mandarin; no key) — or Google Cloud TTS with
`TTS_PROVIDER=google` — stored in Supabase Storage. Audio is built **when a lesson arrives** (routine
draft, Chinese backfill, Masuri's edits, and again at publish as a safety net),
so Heo's taps only play stored files. Old lessons are voiced by the Chinese
backfill (it voices both tracks) or by `POST /api/notebook/routine/audio`
(CRON_SECRET; `GET` shows ready/missing counts). Without a key the app falls
back to the browser voice (only possible with Google and no key).

The Edge voices are an unofficial service. If new audio starts failing
(`[tts] pre-generate failed … Edge TTS failed` in Vercel logs), update the
`msedge-tts` package (it tracks Microsoft's token changes) and redeploy;
already-stored audio keeps playing meanwhile.

## Rollout order (staging first, then prod)

1. **Migrations — before deploying the code.** The new code selects columns
   that don't exist until 021 runs.
   - `supabase/migrations/021_chinese_track.sql` — `title_zh`, `cards_zh`,
     `completed_en_at`, `completed_zh_at`; vocabulary `lang` + `pinyin`, unique
     key becomes `(user_id, lang, word_en)`. Backfills `completed_en_at`.
   - `supabase/migrations/022_tts_cache_bucket.sql` — private `tts` bucket.
   - Both are additive: the currently deployed code keeps working after them.
   - **After** the new code is live in that environment, run
     `supabase/migrations/023_drop_legacy_vocab_unique.sql` (drops the old
     `(user_id, word_en)` constraint the old code relied on).
2. **Env (Vercel):** nothing needed for the default Edge voices. Optional:
   `TTS_VOICE_EN` / `TTS_VOICE_ZH`; or `TTS_PROVIDER=google` +
   `GOOGLE_TTS_API_KEY` (type **Secret**) in both Vercel projects
   (`heo-masuri-staging`, whose Production is the staging site, and
   `heo-masuri`), then redeploy.
3. **Deploy** (merge to `staging`, verify, then `main`).
4. **Daily routine:** update the routine's prompt to the new
   `scripts/routine/ROUTINE_PROMPT.md` — new lessons then arrive with both
   tracks (the draft API validates `cards_zh`).
5. **Backfill old lessons:** run `scripts/routine/ZH_BACKFILL_PROMPT.md`
   (3 lessons per run, oldest first) until it prints `DONE`. Either a separate
   hourly routine with the same `NEXT_PUBLIC_APP_URL` + `CRON_SECRET`, or a
   Claude Code session that has those two values and network access to the app.
   Progress: `GET /api/notebook/routine/zh-backfill` → `remaining`.
   Staging and production are separate databases — backfill each one.

If you ever rotate `CRON_SECRET`, update every caller in the same sitting:
Vercel (+ redeploy), the cron-job.org pinger header
(docs/PHASE2_CRON_PINGER.md), the lesson routine's cloud environment, and
any Claude environment used for the backfill.

## Current status (2026-10-23)

- **Staging:** migrations applied, code live (`staging` = this branch), verified
  end-to-end in a browser (picker, Chinese lesson, Edge audio 200/206, vocab
  saves with pinyin, completion, scrapbook badges). Test lesson: "How Do You
  Feel Today?" (2026-10-23).
- **Production:** migrations 021/022 **not yet applied**. The merge to `main`
  was rolled back (`51ffef0`) within minutes because the new code needs them.
- **Chinese tracks for all 31 production lessons** (25 completed, the
  unfinished 2026-07-01 lesson, 5 queued drafts) are pre-written and reviewed
  in `scripts/routine/zh-backfill-data/`.
- **Why lessons stopped in July:** Heo never finished the 2026-07-01 lesson;
  publish-due holds new lessons until it's done, and the routine stops at 2
  queued drafts (5 are waiting). Finishing that lesson — in either language —
  restarts the daily flow.

### Finish production

1. Run `021_chinese_track.sql` and `022_tts_cache_bucket.sql` in the
   **production** Supabase SQL editor (not `icujnosqjnbimuihxlgr`).
2. Revert the revert on `main` (`git revert 51ffef0`) and push; wait for the
   deploy; `GET /api/notebook/routine/zh-backfill` must return 200.
3. `scripts/routine/upload_zh_backfill.sh https://heo-masuri.vercel.app`
   (uploads every track, then voices every lesson until `missing=0`).
4. Optional cleanup: `023_drop_legacy_vocab_unique.sql` on both projects.

## Verify

- `/heo/notebook/today` shows the language picker for a lesson with `cards_zh`.
- Finish one language → home tile offers "+ Học thêm …"; scrapbook shows badges.
- Tap 🔊 on a word card → network shows `/api/tts?...` 200 (206 on iOS).
- `/m/notebook/approve/<id>` has a 🇨🇳 tab previewing the Chinese track.
