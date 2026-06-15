# Phase 2 — Production migration plan

Blueprint §8.7 deliverable. Exact order to roll Phase 2 from the staging Supabase project (`icujnosqjnbimuihxlgr`) onto the production project before merging `staging` → `main`.

The reveal merge itself is Dân's manual work per §8.6 — this doc covers everything that has to happen on the production database before that merge can land safely.

---

## 1. Pre-flight (do this once, before touching prod)

1. **Confirm staging is green.** `npm run ci:gate` clean on the staging branch tip.
2. **Snapshot production.** Supabase dashboard → Settings → Database → "Manual backup" on the prod project. Save the resulting backup ID — that's the restore target if anything below goes wrong.
3. **Snapshot the prod schema for diffing.**
   ```bash
   # against PROD
   supabase db dump --schema public --data-only=false > /tmp/prod-schema-before.sql
   ```
4. **Verify no in-flight Phase 1.5 hotfix on `main` that hasn't been merged back to `staging`.**
   ```bash
   git fetch --all
   git log staging..origin/main --oneline
   # → expected empty
   ```
   If non-empty, merge `main` into `staging` first, push, re-run ci:gate, then come back.

---

## 2. Apply Phase 2 migrations to production

Run these against the **production** Supabase project, in order. Each is idempotent against staging — they were authored that way. None of them drop or rename data that exists in prod today.

| # | File | What it does | Risk |
|---|---|---|---|
| 007 | `phase2_letters_kind_extension.sql` | Adds new `letters.kind` values | low (additive enum) |
| 008 | `phase2_surprise_pool.sql` | New tables `surprise_pool` + `surprise_deliveries` | low (new tables) |
| 009 | `phase2_recurring_letters.sql` | New `recurring_letters` table | low |
| 010 | `phase2_notification_prefs.sql` | Adds 5 columns to `notification_prefs` with `default true` | low (default-filled) |
| 011 | `phase2b_calendar.sql` | New tables `calendar_events` + `recurring_schedule_template` | low |
| 012 | `phase2b_important_dates.sql` | New `important_dates` table + **import from reunion_dates** | medium — see below |
| 013 | `phase2c_date_ideas.sql` | New `date_ideas` table | low |
| 014 | `cron_heartbeats.sql` | New `cron_heartbeats` table | low |
| 015 | `phase2c_wardrobe.sql` | New tables + private storage bucket `wardrobe` | low (new) |
| 016 | `phase2c_outline_templates.sql` | New `date_outline_templates` table + 8 seeded rows | low |
| 017 | `phase2c_scheduled_dates.sql` | New `scheduled_dates` table + FK backfill on `outfit_suggestions.date_id` | low |
| 018 | `phase2c_cp10_scheduled_dates_fk.sql` | Converts `scheduled_dates.calendar_event_id` FK to `ON DELETE SET NULL` | low (no data touched) |

### 2a. Apply via Supabase CLI

```bash
# from repo root, with SUPABASE_PROJECT_REF=<prod-ref> in env
for f in supabase/migrations/0{07,08,09}_*.sql \
         supabase/migrations/01{0,1,2,3,4,5,6,7,8}_*.sql; do
  echo "== applying $f =="
  supabase db push --linked --include "$f" || break
done
```

(Or apply one-by-one through the Supabase dashboard SQL editor if the CLI isn't on PATH — same files, same order.)

### 2b. 012 deserves a manual check

Migration 012 ends with an `INSERT ... SELECT ... FROM public.reunion_dates` that pulls every existing reunion row into `important_dates`. After running it, verify the import:

```sql
-- Should return one row per reunion_dates row, kind='reunion', label_vi populated.
SELECT id, label_vi, target_date, recurrence, is_current
FROM public.important_dates
WHERE kind = 'reunion'
ORDER BY target_date;

-- Should match the prod reunion_dates count:
SELECT COUNT(*) FROM public.reunion_dates;
```

If counts don't match, **stop**. Don't proceed to step 3 until the rows reconcile.

### 2c. Verify heartbeat table is empty and the dispatcher will populate it

```sql
SELECT * FROM public.cron_heartbeats;
-- → empty on first apply. First dispatcher tick (within 1 minute of pinger reboot) will insert.
```

---

## 3. Environment variables on production Vercel

Set these on the **production** Vercel project before merging code. The names match what staging uses; values must be different.

| Key | Notes |
|---|---|
| `CRON_SECRET` | New random string. Update cron-job.org pinger to use this. |
| `SHORTCUT_TOKEN_HEO` | New random string. Heo's iOS Shortcut gets the new value (docs/IOS_SHORTCUT.md). |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | **MUST be different from staging.** Re-issue via `npx web-push generate-vapid-keys`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | mirror of `VAPID_PUBLIC_KEY` |
| `ENVIRONMENT` | `production` — drives the Discord webhook prefix logic (staging gets `[STAGING]`, prod doesn't) |
| `NEXT_PUBLIC_APP_URL` | prod URL |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod project's values (unchanged from existing prod setup) |

**Do not paste any secret in chat or commits.** Set them via the Vercel dashboard or `vercel env add`.

---

## 4. Cron pinger reconfigure

cron-job.org currently points at the staging URL. After merge:

1. Pause the staging ping job (don't delete — staging will keep running for AI development).
2. Clone it to a new prod job:
   - URL: `https://<prod-host>/api/cron/tick`
   - Method: `GET`
   - Header: `Authorization: Bearer <prod CRON_SECRET>`
   - Schedule: every minute
3. Verify within 2 minutes:
   ```sql
   SELECT * FROM public.cron_heartbeats ORDER BY fired_at DESC LIMIT 5;
   ```
   `dispatcher.age` should stay under ~2 minutes on prod.

---

## 5. The reveal merge (Dân's hand, not the AI's)

Per §8.6:

```bash
git checkout staging
git pull
git merge main          # bring back any hotfixes — should be a no-op if §1.4 was honored
# resolve, push if needed

git checkout main
git pull
git merge staging --no-ff
git push origin main
```

Vercel auto-deploys. Smoke test:

- [ ] `/heo` loads with the new SideNav at lg, BottomNav on mobile
- [ ] `/calendar` paints, granularity tabs swap without empty state
- [ ] `/calendar/important-dates` shows the reunion row(s) imported in step 2b
- [ ] `/dates/plan` renders the index; `+ Lên kế hoạch mới` opens the scheduler with next-free-overlap defaults
- [ ] `/heo/settings` → Notifications has the 5 new toggle rows; saving persists across reload
- [ ] Heartbeat query in step 4 still fresh

---

## 6. Post-merge cleanup (deferred — do NOT run on day 0)

After the reveal has been live for 1-2 weeks with no rollback:

1. **Switch the home-page countdown source from `reunion_dates` to `important_dates`.** Currently `app/heo/page.tsx` and `app/masuri/page.tsx` read `reunion_dates WHERE is_current=true`. Replace with `important_dates WHERE kind='reunion' AND is_current=true`. Same shape, same fields — small diff.
2. **Update `/api/reunion` + `/masuri/reunion` admin to write to `important_dates`** with `kind='reunion'`.
3. **Then** drop the old table:
   ```sql
   -- migration 019_drop_reunion_dates.sql
   drop table public.reunion_dates;
   ```
   Also remove the references in `db/schema.sql`, `types/database.ts`, and `app/api/admin/wipe/route.ts`.
4. **Regen types/database.ts** once supabase CLI is back on PATH:
   ```bash
   npm run db:types
   ```
   Phase 2 routes currently use the untyped `createServerClient()` for tables added since migration 011; after regen they can switch back to `createTypedServerClient()`.

---

## 7. Rollback plan

If anything in step 2 or step 5 goes sideways:

1. **Code rollback** — revert the merge commit on `main`, force-deploy:
   ```bash
   git revert -m 1 <reveal-merge-sha>
   git push origin main
   ```
2. **Schema rollback** — Supabase dashboard → Database → Backups → restore the snapshot from step 1.2. This is destructive of any in-flight Phase 2 writes, which is the right call if the schema is wedged.
3. **Cron pinger** — re-pause the prod job; staging remains untouched.

The reunion_dates table is **deliberately kept** through this whole process so the countdown widget never breaks even if the import in step 2b is rolled back — that's why step 6 is gated on 1-2 weeks of stability.
