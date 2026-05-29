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

## CP3+ — to be added as each phase lands
