# Chinese track + natural-voice audio — rollout

Every daily lesson can now be studied in **English** (`daily_pages.cards`) or
**Chinese** (`daily_pages.cards_zh`, Mandarin, simplified + pinyin + Hán Việt).
Heo picks the language when she opens a lesson; finishing either one completes
the lesson for the day (streak, carry-over and publish-due unchanged), and the
other language stays open — from the home tile, the completion card, or the
scrapbook (polaroids show 🇬🇧 ✓ / 🇨🇳 Học).

Pronunciation now comes from Google Cloud Text-to-Speech (Chirp 3 HD voices),
stored in Supabase Storage. Audio is built **when a lesson arrives** (routine
draft, Chinese backfill, Masuri's edits, and again at publish as a safety net),
so Heo's taps only play stored files. Old lessons are voiced by the Chinese
backfill (it voices both tracks) or by `POST /api/notebook/routine/audio`
(CRON_SECRET; `GET` shows ready/missing counts). Without a key the app falls
back to the browser voice, so nothing breaks before it's set.

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
2. **Env (Vercel):** `GOOGLE_TTS_API_KEY` (API key restricted to Cloud
   Text-to-Speech, billing linked on the Google project) — type **Secret**, in
   both Vercel projects: `heo-masuri-staging` (its Production = the staging
   site) and `heo-masuri`. Redeploy after adding. Optional
   `GOOGLE_TTS_VOICE_EN` / `GOOGLE_TTS_VOICE_ZH`.
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

## Verify

- `/heo/notebook/today` shows the language picker for a lesson with `cards_zh`.
- Finish one language → home tile offers "+ Học thêm …"; scrapbook shows badges.
- Tap 🔊 on a word card → network shows `/api/tts?...` 200 (206 on iOS).
- `/m/notebook/approve/<id>` has a 🇨🇳 tab previewing the Chinese track.
