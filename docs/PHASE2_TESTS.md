# Phase 2 — Manual test backlog

Tests that the AI cannot run end-to-end (require real push, real Discord, real
human eyeballs on a staging URL). Dân runs these whenever convenient and ticks
them off; results inform checkpoint sign-off.

Format: `[ ]` pending, `[x]` passed, `[!]` failed (add a note about why).

---

## CP0 — staging isolation

- [X] Visit `https://heo-masuri-staging.vercel.app` → password / Vercel Auth prompt appears (proves deployment protection is on)
- [X] After auth, soft-gate as `heo` → home loads with "Test Heo"
- [X] Soft-gate as `masuri` → home loads with "Test Masuri"
- [x] Press the missing button on staging → Discord message lands with `[STAGING]` prefix in the username

---

## CP1 — Phase 2A: delivery worker, dispatcher, surprise admin
I use cron-job.org for this
### Dispatcher auth + scheduling
- [X] `curl https://heo-masuri-staging.vercel.app/api/cron/tick -H "Authorization: Bearer $CRON_SECRET"`
  - Returns `{ utc, ran, results, errors }`
  - `ran` includes `deliver-scheduled` only when current UTC minute is divisible by 5
  - `ran` includes `reminder` only at 13:00 UTC
  - `ran` includes `publish-due` only at 23:00 UTC
- [X] Same URL without the Authorization header → 401 `{ error: "Unauthorized" }`

### Surprise pool admin (`/masuri/surprises`)
- [x] Page loads with empty list + add form + "less than 5 active" warning
- [x] Add a surprise (vi, weight 1) — appears in list immediately, warning still shown
- [x] Add 4 more surprises in different languages and weights — warning disappears at 5 active
- [x] Click "Retire" on one — row strikes through, "active" count drops, label says "retired"
- [x] Click "Un-retire" — restored
- [x] Reload page — state persists
- [x] Heo (not Masuri) tries to navigate to `/masuri/surprises` → soft-gate redirect (middleware)

### End-to-end scheduled delivery
- [X] Insert letter from Test Masuri to Test Heo, `kind='love_note'`, `scheduled_for=now()`, `delivered_at=NULL` (via MCP SQL)
- [X] Simulated worker atomic update (`UPDATE … WHERE delivered_at IS NULL`) — letter delivered_at populated
- [X] Idempotency verified — second run with the same guard updates 0 rows
- [ ] Push side: confirm web push fires with "Thư từ Masuri 💌" (requires push-subscribed device — Dân's check)

### Quiet-hours defer
- [X] Set Test Heo `quiet_start='18:00'`, `quiet_end='19:00'` (window containing current VN time)
- [X] Insert second test letter — delivered_at remains NULL
- [X] Replicated `checkQuietHours()` predicate in SQL — returns `true` for now (would defer in worker)
- [X] Reset quiet hours to NULL — atomic update succeeds, letter delivered_at populated

---

## CP2 — Phase 2A: GM/GN configuration + cron

### Admin UI (`/masuri/gmgn`)
- [X] Page loads with two cards: GM and GN
- [X] First visit shows defaults (GM 07:00 / GN 22:00, pool with one starter line, enabled off-or-on)
- [X] Edit GM: change time, edit pool (one message per line), save → "✓ Saved …" appears
- [X] Reload page → state persists (proves PUT upserted correctly)
- [X] Heo (not Masuri) tries `/masuri/gmgn` → middleware redirects

### Direct cron auth
- [X] `curl /api/cron/gmgn-tick -H "Authorization: Bearer $CRON_SECRET"` → JSON `{ matched, delivered, skipped_same_day, errors }`
- [X] Without Bearer → 401

### End-to-end via the dispatcher
- [X] Set GM `send_at_local`=current VN HH:MM, `enabled=true`, pool=`['CP2-test-A', 'CP2-test-B', 'CP2-test-C']`, `last_pool_index=-1`
- [X] Simulated first fire — letter inserted: `kind='gm'`, `body='CP2-test-A'`, `delivered_at=now`; `recurring_letters.last_delivered_at` populated, `last_pool_index=0`
- [X] Same-day idempotency predicate verified: `vnDayKey(last_delivered_at) === vnDayKey(now)` → `true` → second fire skipped
- [X] Next-day fire (rolled `last_delivered_at` back 24h) → pool[1]=`'CP2-test-B'`, `last_pool_index=1`
- [X] Next-next day → pool[2]=`'CP2-test-C'`, idx=2
- [X] Day-4 fire → wraps to pool[0]=`'CP2-test-A'`, idx=0

### Push + quiet-hours behavior
- [ ] Push side: confirm push fires when `gmgn_enabled=true` + not in quiet hours (requires push-subscribed device)
- [ ] In quiet hours: letter row inserted + index advanced + push suppressed (verified suppression logic in `lib/push.ts:sendPushIfAllowed` reads `quiet_start`/`quiet_end` and returns before sending. Letter insert + index advance happen BEFORE the push call so they always proceed.)
- [ ] `gmgn_enabled=false`: letter still inserted (auto-note recorded), push suppressed by same helper

### Disable
- [X] Set `enabled=false` → worker query `where enabled=true and send_at_local=…` returns 0 rows → no insert, no push, `last_pool_index` unchanged


---

## CP3 — Phase 2B: calendar migrations + mobile WeekHourView/WeekBlockView

### Auth + layout
- [X] `/calendar` reachable as Heo and as Masuri after soft-gate
- [X] Unauthenticated visit to `/calendar` → middleware redirects to `/`
- [X] Bottom nav still shows on `/calendar` (RealtimeProvider + nav present in layout)
- [x] Calendar is not yet linked from any home tile or nav — must be reached by typing `/calendar` (tile/nav addition tracked separately)

### Hour view (default)
- [x] Header shows current week range (e.g. "26 thg 5 – 1 thg 6")
- [x] Scroll position lands near "now − 1h" on first paint when viewing the current week
- [x] Tap an empty cell → cell turns pink (own-busy color), event persists in DB
- [x] Tap the same cell again → cell clears, event deleted
- [!] Switch to 30-min granularity → cell count doubles per day, scroll behavior intact //click 17:00 but mark some random cell in 30-min and hour, and when mark the 30, the hour mark full cell mean that that hour is being blocked //
- [X] Granularity preference persists across full page reload (localStorage)
- [X] Now indicator (pink horizontal line) renders only when the current week is in view; disappears on prev/next nav

### Block view
- [X] Switch granularity to "Buổi" → list of 7 day cards with 4 pill buttons each (Sáng / Chiều / Tối / Đêm khuya)
- [!] Tap "Sáng" on today → label changes to "Bạn bận", refresh persists //same problem as other granularity, click one but lock the other//
- [X] Tap again → reverts to "Trống" //ok but too long, can we render the UI first then let the send in the background? apply to all other sending//
- [!] Today's card has a stronger border/shadow than other days //border is too thin, make the today appear more clear with bolder border and shadow//

### Quick-block FAB
- [!] Bottom-right FAB visible, doesn't overlap content //When scroll down, the button with the plus on it is hidden behind the nav bar, make it fixed//
- [X] Tap → bottom sheet with three span chips + 5 period options
- [!] "Hôm nay" + "Sáng" → events for 8–12 today appear in hour view //No it don't appear//
- [!] "Cả tuần" + "Cả ngày" → events for today through Sunday, each 8–24, all appear //Can not select all because when tap 1, it's pending and then close the pop up//
- [!] "Ngày mai" + "Tối" → 17–21 event appears tomorrow

### Visibility filter (the privacy guarantee) — VERIFIED VIA CURL
- [X] Inserted calendar_events row owned by Test Masuri with `share_details=false`, `title='CP3-visibility-Project planning'`, `note='CP3-visibility-Internal'`, `emoji='🔒'`
- [X] `curl -H "Cookie: who=heo" /api/calendar/events?from&to` → response includes the event with `title: null, note: null, emoji: null, share_details: false, is_own: false` ✓ stripped server-side
- [X] Toggled `share_details=true` → Heo's response now includes the title/note/emoji ✓
- [X] `curl -H "Cookie: who=masuri" …` (own event) → always sees own title/note/emoji, `is_own: true` ✓

### Week navigation
- [X] Tap prev/next chevron → week changes, events refetched
- [X] "Về tuần này" link appears when not on current week; tap → returns to current //worked but need refine the UI later//
- [X] Loading indicator shows briefly during refetch

---

## CP3 round-3 polish (after round-2 review)

After `fd9cfb9` shipped, Dân's review flagged four more issues. All addressed in the follow-up.

### Loading indicator no longer jumps the layout
- [ ] Hit prev/next week — header height stays constant. "Đang tải…" appears/disappears in-place (visibility toggled, space reserved).

### Quick-block FAB uses explicit submit
- [ ] Open the sheet → both span and period are toggleable state (no auto-submit on period tap)
- [ ] Select "Cả tuần" + "Cả ngày" → sheet stays open, "Chặn" button is enabled
- [ ] Tap "Chặn" → events created, sheet closes
- [ ] Submit button disabled until a period is chosen
- [ ] "Hủy" closes without creating

### 30-min event shows half-cell at 1-hour granularity
- [ ] Switch to 30 phút, tap a single half-hour cell (e.g. the 17:00–17:30 row)
- [ ] Switch to 1 giờ — the 17:00 cell now shows a half-height fill in the TOP half (not the full hour)
- [ ] Tap a 17:30–18:00 half-hour cell at 30 phút → switching to 1 giờ shows the BOTTOM half filled
- [ ] An event that fully covers an hour (e.g. 17:00–18:00 via two consecutive half-hour blocks, OR an hour-granularity tap) still shows the full hour filled

### Block view: today and future only
- [ ] On any weekday other than Monday, switch to Buổi (block view) — past day cards (cards before today) are gone; today is the first card; remaining future days follow
- [ ] On Monday, all 7 days visible (nothing in the past for this week)
- [ ] Navigate to previous week → all day cards hidden (entire week is in the past)
- [ ] Navigate to next week → all 7 cards visible (entire week is in the future)

---

## CP4+ — to be added as each phase lands
