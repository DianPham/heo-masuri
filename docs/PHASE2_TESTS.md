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

## CP3 round-4 — multi-period FAB + partner-blue palette

### Quick-block FAB: multiple periods per submit
- [ ] Open the FAB sheet → period chips show checkboxes
- [ ] Tap "Sáng" then "Chiều" — both stay selected (no auto-clear). Submit label changes to "Chặn 2 khoảng"
- [ ] Tap "Cả ngày" — Sáng/Chiều/Tối/Đêm khuya auto-deselect (mutually exclusive). Label = "Chặn 1 khoảng"
- [ ] Tap a single non-all-day period — "Cả ngày" deselects. Multi-select among the four works
- [ ] Submit fires N parallel quick-block POSTs (one per period), then reload. All chosen ranges appear on the grid
- [ ] Empty selection → submit button is disabled

### Partner cells are now blue
- [ ] Have Test Masuri block a slot (e.g. via SQL `insert into calendar_events ... share_details=false`)
- [ ] Soft-gate as Test Heo, switch to hour/30-min granularity → Masuri's slot renders as a soft **blue** fill (not the previous lilac)
- [ ] If Heo also blocks the same slot → cell shows a **purple** fill (pink × blue mix), distinct from both single cases
- [ ] Block view: partner Sáng block shows blue background; both-busy block shows purple

---

## CP4 — Phase 2B: desktop calendar (WeekDesktopView) + keyboard nav

### Layout switching
- [ ] On a viewport ≥ 1024px, navigate to `/calendar` → renders the desktop horizontal week grid (7 day columns × 24 hour rows). The mobile card wrapper is gone — calendar uses full width.
- [ ] Drag the browser narrower below 1024px → flips back to the mobile WeekHourView (or WeekBlockView if Buổi is selected)
- [ ] Drag wider again → reverts to desktop
- [ ] Granularity tabs still work on desktop for hour/30-min. "Buổi" is mobile-only (when selected on desktop, falls back to the mobile block layout — that's expected for now)

### Desktop grid
- [ ] Hours column on the left (00:00–23:00 labels), 7 day columns to the right
- [ ] Sticky day header strip with `Thứ 2 … Chủ nhật` + `DD/MM` + "Hôm nay" badge on today
- [ ] Scrolls vertically; lands near now − 1h on the current week
- [ ] Now indicator (pink horizontal line) appears across today's column on the current week, hidden on other weeks
- [ ] Hover over an empty cell → soft rose tint background (desktop hover affordance)
- [ ] Click an empty cell → cell fills with own-busy pink, persists in DB (optimistic UI)
- [ ] Click an own busy cell → clears, deletes
- [ ] Click a partner-only cell → no-op (read-only, as on mobile)
- [ ] Half-hour granularity on desktop → 48 rows tall, same fractional fills apply

### Keyboard navigation
- [ ] Press `←` (LeftArrow) on either layout → go to previous week
- [ ] Press `→` (RightArrow) → next week
- [ ] Press `t` or `T` → jump back to current week
- [ ] Focus an `<input>` or `<textarea>` (e.g. inside the GM/GN admin or notebook somewhere) and press `t` → the keyboard handler ignores it (does NOT trigger goToday)
- [ ] (Esc, Cmd+N — covered in CP4 round-2 below; drag-to-resize handles — covered in CP4 final below)

### CP4 final — right-click context menu (replaces previous straight-to-sheet)
- [ ] Right-click on an empty cell → menu appears at the cursor with "Đánh dấu bận" + "Sự kiện mới…"
- [ ] Click "Đánh dấu bận" → cell turns pink, persists; menu closes
- [ ] Click "Sự kiện mới…" → CREATE sheet opens for that single cell
- [ ] Right-click on your own (pink) event → menu shows "Sửa…" + "Xóa" (Xóa in rose)
- [ ] "Sửa…" → EDIT sheet opens; "Xóa" → confirm() dialog → event deletes
- [ ] Right-click on a partner (blue) cell where the partner HAS shared details (title/note set) → small popover shows the title/note/emoji
- [ ] Right-click on a partner cell with NO shared details → no menu opens (privacy preserved, no native menu either since we still preventDefault)
- [ ] Click anywhere outside the menu → menu closes
- [ ] Start scrolling the page → menu closes

### CP4 final — drag-to-resize handles
- [ ] At `/calendar` on desktop (≥1024px), every own (pink) event shows a small rose handle bar at its bottom edge (4–6px tall, slight horizontal margin, ns-resize cursor on hover)
- [ ] Mouse-down on the handle and drag DOWN → event's bottom edge extends in slot-sized steps (1h or 30min depending on granularity). The pink fill grows live as you drag.
- [ ] Drag UP past the start of the event → it does NOT shrink below 1 slot (min duration enforced)
- [ ] Release → the new end_at is persisted (PATCH). Refresh the page → event still has the new end.
- [ ] Drag-resize on an event with a title set → title and properties are preserved (PATCH only updates end_at)
- [ ] During resize, the underlying cell does NOT also trigger click-toggle or drag-to-create
- [ ] Partner (blue) events do NOT show a resize handle (only own events get them)

---

## CP4 round-2 — EventDetailSheet wiring

### Desktop drag-to-create
- [ ] At `/calendar` on desktop (≥1024px), click-and-drag vertically across multiple cells in one column → a soft rose highlight follows the drag
- [ ] Release the mouse → EventDetailSheet opens in CREATE mode, centered as a modal
- [ ] Time-range line in the sheet matches the dragged span (e.g. "Mon 16/06 · 09:00 – 11:30")
- [ ] Fill in title "Họp dự án", optional note, save → sheet closes, the dragged span paints pink with the title baked in
- [ ] Drag again over an existing own event area → release opens create (not edit); will overlap the existing event

### Desktop right-click edit
- [ ] Right-click on an EMPTY cell → CREATE sheet opens for just that 1-cell slot (no native context menu)
- [ ] Right-click on a cell that overlaps your own event → EDIT sheet opens, fields pre-populated from the event
- [ ] Edit the title in the sheet, save → the event's title updates, sheet closes
- [ ] Open edit sheet again, click "Xóa sự kiện" → confirm dialog → event disappears from the grid
- [ ] Press `Esc` while a sheet is open → sheet closes without saving

### Desktop click vs drag
- [ ] Single click on an empty cell (no drag) → still does the existing quick-toggle (cell becomes pink, no sheet opens)
- [ ] Click-drag of just 1 cell (mouse barely moves) → quick-toggle, no sheet
- [ ] Click-drag of 2+ cells → sheet opens, quick-toggle does NOT also fire

### Top-bar "Add event" button + Cmd/Ctrl+N
- [ ] At `/calendar` on desktop (≥1024px), a pink "+ Sự kiện mới" pill button appears next to the week navigation arrows
- [ ] Click the button → CREATE sheet opens with a default 1-hour slot:
  - Current week → today at the next rounded hour (e.g. it's 14:23 → slot starts 15:00)
  - Past/future weeks → Monday 09:00 of the displayed week
- [ ] On mobile (<1024px), the button is NOT shown (mobile users have FAB + long-press)
- [ ] Press `Cmd+N` (Mac) / `Ctrl+N` (Win) anywhere on the calendar page → CREATE sheet opens with the same default
- [ ] `Cmd+N` while focused inside a sheet input → still opens a sheet? No — the shell keyboard handler ignores INPUT/TEXTAREA focus, so the shortcut is suppressed mid-edit (verify)
- [ ] Save a new event via this flow → event appears on the grid after the reload, in the right slot, with the title shown

### Mobile long-press
- [ ] On a phone-sized viewport at `/calendar`, long-press (~0.5s) an empty hour-view cell → EventDetailSheet opens as a bottom sheet in CREATE mode for that cell
- [ ] Long-press a cell containing your own event → EDIT sheet opens, pre-populated
- [ ] Vertical-scroll the calendar (touch + drag) → no sheet opens; scroll cancels the long-press timer
- [ ] Quick tap (no hold) → still runs the existing quick-toggle (no sheet)
- [ ] Block view: long-press a free "Sáng" pill → CREATE sheet for the 8–12 window
- [ ] Block view: long-press a pink "Sáng" pill (your own block) → EDIT sheet for the underlying event
- [ ] Save → optimistic update reflects immediately; closing & reopening shows the persisted edit

---

## CP3/CP4 round-5 — flicker / split / overlay / side nav

### No more flicker on cell tap
- [ ] Tap an empty cell → cell goes pink and STAYS pink (no white flash from "Đang tải…" load cycle)
- [ ] Tap the same cell again → cell clears and stays cleared (no flicker)
- [ ] Loading indicator only appears on week prev/next and FAB submit, never on individual taps

### Partial unblock splits the underlying event
- [ ] Use FAB to block "Hôm nay × Sáng" (8-12, a single 4-hour event)
- [ ] Hour view: tap the 10:00 cell → only the 10:00 cell clears. 8:00, 9:00, 11:00 stay pink
- [ ] Inspect DB (or refresh) — the original 8-12 event is replaced by two events: 8-10 and 11-12
- [ ] Tap 8:00 (left edge of an 8-10 event) → 8:00 clears; the event becomes 9-10
- [ ] Tap 11:00 (right edge of an 11-12 event) → 11:00 clears; the event becomes empty (deleted)
- [ ] Tap the only remaining cell of a 1-cell event → cell clears and event deletes (no fragmentation)

### Overlay onto a partner cell
- [ ] Have Test Masuri block a cell (insert via SQL or via Masuri's session)
- [ ] As Heo, tap that blue partner cell → it turns purple (overlap), an own event is created on top
- [ ] Tap the now-purple cell as Heo → own event removed (splits or deletes as above); cell returns to blue (partner still busy)
- [ ] Masuri's event is untouched throughout

### Side nav on desktop (lg+)
- [ ] `/calendar` at desktop width → a narrow left sidebar appears with Home / Sổ tay / Lịch / Cài đặt; the floating bottom-nav pill is gone
- [ ] Active item highlighted with a soft rose background
- [ ] Calendar grid uses the space to the right of the sidebar (no overlap)
- [ ] Resize narrower than 1024px → sidebar disappears, floating bottom-nav pill returns
- [ ] Click a sidebar item → navigates to that route
- [ ] Non-calendar routes (e.g. `/heo`, `/masuri`) still show the bottom nav as before (this change is scoped to /calendar's layout)

---

## CP5 — Phase 2B: recurring schedule template (§6.6)

### Editor page
- [ ] As Masuri, visit `/masuri/calendar/template` → page renders "Lịch lặp hàng tuần" header, description, enabled checkbox, the 7-col × 24-row grid, and the action buttons (Lưu / Áp dụng tuần này / Áp dụng 4 tuần tới / Xóa hết)
- [ ] As Heo, visit `/masuri/calendar/template` → middleware redirects to `/`
- [ ] At `/calendar` while signed in as Masuri → a "Lịch lặp hàng tuần ↗" link appears under the granularity tabs; clicking it navigates to the editor
- [ ] At `/calendar` while signed in as Heo → the link does NOT appear

### Editing cells
- [ ] Tap an empty hour cell → fills pink (busy)
- [ ] Tap a pink cell → clears
- [ ] Cells across multiple days work independently
- [ ] Click "Xóa hết" → confirm dialog → all cells clear
- [ ] Reload the page (without saving) → cells revert to the last-saved state

### Save
- [ ] Mark e.g. Mon 09:00-12:00 and Wed 14:00-17:00 busy, click "Lưu mẫu" → small green "Đã lưu" hint appears under the buttons (~2s)
- [ ] Refresh the page → marks persist
- [ ] In DB: `SELECT template FROM recurring_schedule_template WHERE user_id='<masuri-id>'` → contiguous hour marks should coalesce into compact ranges (e.g. one `{start_minute:540, end_minute:720}` for Mon 9–12, NOT three separate hour ranges)

### Apply to this week
- [ ] Click "Áp dụng tuần này" → alert "Đã áp dụng cho tuần này: N sự kiện (xóa M cũ)"
- [ ] Visit `/calendar` (current week, masuri viewer) → the template marks appear pink in the right slots
- [ ] In DB: `SELECT count(*) FROM calendar_events WHERE owner=<masuri-id> AND source='recurring_template' AND source_ref=<masuri-id> AND start_at >= <monday-of-this-week-utc>` → matches the alert's "N sự kiện" count
- [ ] Click "Áp dụng tuần này" AGAIN → no duplicate explosion; DB count stays the same (purge-then-insert is idempotent)

### Editing after apply
- [ ] Edit the template (e.g. remove Mon 09:00, add Tue 10:00), Save, then "Áp dụng tuần này" again → calendar now reflects the edit; the old Mon 09:00 event is gone, Tue 10:00 appears
- [ ] Manually create a `source='manual'` event at Mon 10:00 in /calendar; re-apply template → the manual event is preserved (only `source='recurring_template'` events are purged)

### Apply forward 4 weeks
- [ ] Mark a few busy cells, Save, then "Áp dụng 4 tuần tới" → alert "Áp dụng cho 4 tuần (bỏ qua 0 tuần đã có mẫu)"
- [ ] Visit /calendar and arrow through the next 4 Mondays → each week shows the template marks
- [ ] Click "Áp dụng 4 tuần tới" again → alert says "Áp dụng cho 0 tuần (bỏ qua 4 tuần đã có mẫu)" — already-templated weeks are skipped (per blueprint §6.6)
- [ ] Use "Áp dụng tuần này" to refresh THIS week, then "Áp dụng 4 tuần tới" again → still skips this week (it now has template events) and the 3 future weeks already-templated; no duplicates

### Privacy / cross-user
- [ ] As Heo (different cookie), visit /calendar → Masuri's template events appear blue (partner-busy) for the affected slots, without titles (template events have no title)

---

## CP4+ — to be added as each phase lands
