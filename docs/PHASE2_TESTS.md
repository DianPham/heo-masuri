# Phase 2 — Manual test backlog

Tests that the AI cannot run end-to-end (require real push, real Discord, real
human eyeballs on a staging URL). Dân runs these whenever convenient and ticks
them off; results inform checkpoint sign-off.

Format: `[ ]` pending, `[x]` passed, `[!]` failed (add a note about why).

---

## CP0 — staging isolation

- [ ] Visit `https://heo-masuri-staging.vercel.app` → password / Vercel Auth prompt appears (proves deployment protection is on)
- [ ] After auth, soft-gate as `heo` → home loads with "Test Heo"
- [ ] Soft-gate as `masuri` → home loads with "Test Masuri"
- [ ] Press the missing button on staging → Discord message lands with `[STAGING]` prefix in the username

---

## CP1 — Phase 2A: delivery worker, dispatcher, surprise admin

### Dispatcher auth + scheduling
- [ ] `curl https://heo-masuri-staging.vercel.app/api/cron/tick -H "Authorization: Bearer $CRON_SECRET"`
  - Returns `{ utc, ran, results, errors }`
  - `ran` includes `deliver-scheduled` only when current UTC minute is divisible by 5
  - `ran` includes `reminder` only at 13:00 UTC
  - `ran` includes `publish-due` only at 23:00 UTC
- [ ] Same URL without the Authorization header → 401 `{ error: "Unauthorized" }`

### Surprise pool admin (`/masuri/surprises`)
- [ ] Page loads with empty list + add form + "less than 5 active" warning
- [ ] Add a surprise (vi, weight 1) — appears in list immediately, warning still shown
- [ ] Add 4 more surprises in different languages and weights — warning disappears at 5 active
- [ ] Click "Retire" on one — row strikes through, "active" count drops, label says "retired"
- [ ] Click "Un-retire" — restored
- [ ] Reload page — state persists
- [ ] Heo (not Masuri) tries to navigate to `/masuri/surprises` → soft-gate redirect (middleware)

### End-to-end scheduled delivery
- [ ] In Supabase SQL editor: insert a `letters` row from Test Masuri to Test Heo with `kind='love_note'`, `scheduled_for = now()`, `delivered_at = NULL`
- [ ] Wait ≤5 min, or manually `curl /api/cron/tick` with Bearer
- [ ] Verify `letters.delivered_at` is populated for that row
- [ ] If Heo has push subscribed on staging: web push fires with "Thư từ Masuri 💌"
- [ ] No double-delivery if cron fires twice (delivered_at idempotency guard)

### Quiet-hours defer
- [ ] In SQL: set Test Heo's `notification_prefs.quiet_start`/`quiet_end` to a window containing "now"
- [ ] Insert another scheduled letter as above
- [ ] Manually fire `/api/cron/tick` (so it's deterministic) — verify `delivered_at` stays NULL
- [ ] Response JSON shows `deferred_quiet: 1`
- [ ] Reset quiet hours to NULL, fire tick again → letter now delivered

---

## CP2 — Phase 2A: GM/GN configuration + cron

### Admin UI (`/masuri/gmgn`)
- [ ] Page loads with two cards: GM and GN
- [ ] First visit shows defaults (GM 07:00 / GN 22:00, pool with one starter line, enabled off-or-on)
- [ ] Edit GM: change time, edit pool (one message per line), save → "✓ Saved …" appears
- [ ] Reload page → state persists (proves PUT upserted correctly)
- [ ] Heo (not Masuri) tries `/masuri/gmgn` → middleware redirects

### Direct cron auth
- [ ] `curl /api/cron/gmgn-tick -H "Authorization: Bearer $CRON_SECRET"` → JSON `{ matched, delivered, skipped_same_day, errors }`
- [ ] Without Bearer → 401

### End-to-end via the dispatcher
- [ ] Set GM `send_at_local` to "now + 1 minute" in VN time, enabled=true, pool with 3 strings
- [ ] At the target minute, dispatcher fires (or manually `curl /api/cron/tick`) → `letters` row appears: `kind='gm'`, body = pool[0], delivered_at set
- [ ] `recurring_letters.last_delivered_at` is populated, `last_pool_index` = 0
- [ ] Fire dispatcher again same day at same minute → no second letter (same-day idempotency)
- [ ] Next day at same minute → new letter with pool[1] (rotation through pool)
- [ ] After pool exhausted, wraps to pool[0]

### Push + quiet-hours behavior
- [ ] When `notification_prefs.gmgn_enabled = true` and not in quiet hours → push fires
- [ ] Set quiet hours to include "now", fire tick → letter row STILL inserted, index STILL advances, but push is suppressed (matches blueprint §5.3 intent: GM/GN auto-note is recorded; notification is suppressed silently — distinct from scheduled-letter delivery which DEFERS the whole thing)
- [ ] Set `gmgn_enabled = false`, fire tick at configured time → letter still inserted (auto-note recorded), push suppressed

### Disable
- [ ] Set `enabled=false` on GM, fire tick at configured time → no insert, no push, `last_delivered_at` unchanged

---

## Hotfix (2026-06-08): publish-due unfinished-lesson gate

Hotfix `caba7df` on `main` (merged into `staging` as `168d496`). Restored
correctness of the gate by removing the time window entirely. The first
hotfix (`4d58a66`, anchored on `published_at` with a 14-day window) was
superseded — windowed gates have an entire class of silent expiry bugs.

### Manual sanity (against production)
- [ ] Apply the data cleanup SQL from the `4d58a66` commit message: keep the most-recent unfinished published lesson; demote the rest back to `approved`.
- [ ] Confirm `select count(*) from daily_pages where status='published' and completed_at is null` returns 1.
- [ ] At next cron fire (06:00 VN), confirm no new lesson published (gate held).
- [ ] Complete the carry-over lesson as Heo. The next cron fire should publish exactly one approved lesson.

### Defensive checks (any environment with data)
- [ ] Insert a fake unfinished `published` lesson with `published_at = now() - interval '60 days'`. Trigger publish-due (with CRON_SECRET). Response: skipped ("Heo has an unfinished lesson…"). The previous time-window bug class is gone.
- [ ] Trigger publish-due twice within the same minute. First call publishes, second returns "already published today" (daily idempotency check held).
- [ ] With NO unfinished lesson present, fire publish-due via curl with Bearer — publishes exactly one approved lesson, response shows `published: 1`.

---

## Staging Vercel deploy gotchas (CP3 visibility)

Two separate misconfigurations were keeping CP1–CP3 off the stable staging URL.

### 1. Production Branch was `main`
- [ ] Vercel dashboard → `heo-masuri-staging` → Settings → Git → **Production Branch** is set to `staging` (not `main`). Without this, pushes to `staging` build as Preview only and the stable URL serves stale code from whatever was last deployed off `main`.

### 2. Hobby plan rejects minute-cadence crons
The CP1 dispatcher (`/api/cron/tick` every minute) silently rejected
every production deploy on Hobby — only Preview deploys went through.
Restored to the Phase 1.5 daily pair in `a9e8169`:

```json
{
  "crons": [
    { "path": "/api/notebook/admin/publish-due", "schedule": "0 23 * * *" },
    { "path": "/api/cron/reminder",              "schedule": "0 13 * * *" }
  ]
}
```

`/api/cron/tick`, `/api/cron/deliver-scheduled`, `/api/cron/gmgn-tick` all
still exist as endpoints and work via curl with Bearer auth — they just
aren't on a Vercel-managed schedule.

- [ ] Confirm staging production deploy now succeeds (no `deploy_failed` for cron-cadence reason). `vercel ls heo-masuri-staging | head` should show a recent Production deploy with status `● Ready`.
- [ ] Visit `https://heo-masuri-staging.vercel.app/calendar` (after soft-gate) and confirm the CP3 UI renders.

### Phase 2 cron decision (BLOCKS Phase 2A launch)
Phase 2 features (delivery worker, GM/GN, surprise tick) need minute or
hourly cadence. Pick one:
- Upgrade Vercel to Pro ($20/mo) and re-register `/api/cron/tick` at `* * * * *`.
- Use an external minute pinger (cron-job.org, uptimerobot, github actions) calling `https://<staging-url>/api/cron/tick` with `Authorization: Bearer $CRON_SECRET`.
- Move scheduling to Supabase pg_cron with HTTP extension.

---

## CP3 — Phase 2B: calendar migrations + mobile WeekHourView/WeekBlockView

### Auth + layout
- [ ] `/calendar` reachable as Heo and as Masuri after soft-gate
- [ ] Unauthenticated visit to `/calendar` → middleware redirects to `/`
- [ ] Bottom nav still shows on `/calendar` (RealtimeProvider + nav present in layout)
- [ ] Calendar is not yet linked from any home tile or nav — must be reached by typing `/calendar` (tile/nav addition tracked separately)

### Hour view (default)
- [ ] Header shows current week range (e.g. "26 thg 5 – 1 thg 6")
- [ ] Scroll position lands near "now − 1h" on first paint when viewing the current week
- [ ] Tap an empty cell → cell turns pink (own-busy color), event persists in DB
- [ ] Tap the same cell again → cell clears, event deleted
- [ ] Switch to 30-min granularity → cell count doubles per day, scroll behavior intact
- [ ] Granularity preference persists across full page reload (localStorage)
- [ ] Now indicator (pink horizontal line) renders only when the current week is in view; disappears on prev/next nav

### Block view
- [ ] Switch granularity to "Buổi" → list of 7 day cards with 4 pill buttons each (Sáng / Chiều / Tối / Đêm khuya)
- [ ] Tap "Sáng" on today → label changes to "Bạn bận", refresh persists
- [ ] Tap again → reverts to "Trống"
- [ ] Today's card has a stronger border/shadow than other days

### Quick-block FAB
- [ ] Bottom-right FAB visible, doesn't overlap content
- [ ] Tap → bottom sheet with three span chips + 5 period options
- [ ] "Hôm nay" + "Sáng" → events for 8–12 today appear in hour view
- [ ] "Cả tuần" + "Cả ngày" → events for today through Sunday, each 8–24, all appear
- [ ] "Ngày mai" + "Tối" → 17–21 event appears tomorrow

### Visibility filter (the privacy guarantee)
- [ ] In SQL: insert a calendar_events row owned by Test Masuri with `share_details=false`, `title='Project planning'`, `note='Internal'`
- [ ] Soft-gate as Heo, open `/calendar` → the time block shows as partner-busy (lilac), but **title/note/emoji must be null in the response**. Inspect /api/calendar/events JSON in DevTools to confirm.
- [ ] Update the row to `share_details=true` → response now includes title/note/emoji
- [ ] Open as Masuri → always sees own title/note (no stripping)

### Week navigation
- [ ] Tap prev/next chevron → week changes, events refetched
- [ ] "Về tuần này" link appears when not on current week; tap → returns to current
- [ ] Loading indicator shows briefly during refetch

---

## CP4+ — to be added as each phase lands
