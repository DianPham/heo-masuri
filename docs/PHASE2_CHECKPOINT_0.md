# Phase 2 — Checkpoint 0 handoff

Everything below is what Dân needs to do in external dashboards (Supabase, Vercel, Discord, locally) to finish Checkpoint 0. The in-repo scaffolding is already done on the `staging` branch.

Work top-to-bottom. Steps 1–6 unblock Phase 2A. Steps 7–8 are post-staging cleanup that can wait until everything else is set.

---

## What's already done on `staging` (no action needed)

- `staging` branch cut from `main` and pushed
- `package.json` scripts: `typecheck`, `lint`, `db:dump`, `db:types`, `db:diff`, `ci:gate`
- `lib/discord.ts` — added `webhookUsername()` helper and `sendWebhook()` low-level helper. The helper prefixes the Discord display name with `[STAGING]` when `ENVIRONMENT=staging`
- All existing Discord webhook call sites refactored to route through `sendWebhook`:
  - `app/api/notebook/page/complete/route.ts`
  - `app/api/notebook/admin/regenerate/route.ts`
  - `app/api/notebook/admin/publish-due/route.ts`
  - `app/api/notebook/routine/draft/route.ts`
  - `app/api/notebook/ask/route.ts`
  - `scripts/routine/notify_masuri.ts`
- `db/schema.sql` — pre-Phase-2 baseline (hand-derived from migrations 001–006). Will be replaced by `npm run db:dump` once staging Supabase is up
- `.env.local.example` — updated with all Phase 2 env vars

`npm run ci:gate` exits 0 on this commit.

---

## What you need to do (in order)

### 1. Create staging Supabase project

- Supabase dashboard → **New project** → name `heo-masuri-staging`, region **Singapore** (same as prod)
- Copy these values from **Project Settings → API**:
  - Project URL (looks like `https://<ref>.supabase.co`)
  - `anon` key
  - `service_role` key
  - Project ref (the `<ref>` portion of the URL)

### 2. Apply existing migrations 001–006 to staging

Easiest path:

```bash
# From the repo root, with Supabase CLI installed
supabase link --project-ref <STAGING_REF>
# This will prompt for the staging database password
supabase db push
```

Or, if you prefer to paste manually: copy each of `supabase/migrations/001*.sql` through `006*.sql` into the SQL Editor on the staging project in numerical order and execute.

**Don't seed Phase 1 user data.** Instead, create two test users with random UUIDs:

```sql
insert into public.users (id, slug, name) values
  (gen_random_uuid(), 'heo',    'Test Heo'),
  (gen_random_uuid(), 'masuri', 'Test Masuri');
```

### 3. Generate the canonical schema dump + types

After step 2 succeeds, from the repo root:

```bash
# In .env.local, set SUPABASE_STAGING_PROJECT_REF=<ref-from-step-1>
npm run db:dump      # overwrites db/schema.sql with the real pg_dump
npm run db:types     # writes types/database.ts from the live staging schema
git add db/schema.sql types/database.ts
git commit -m "chore: baseline schema and types from staging Supabase"
```

If `npm run db:types` errors with "no such command", install the Supabase CLI first:

```bash
npm install -g supabase
```

### 4. Create staging Discord channels + webhooks

In your existing Discord server:

1. New category: `[STAGING] Heo & Masuri`
2. Inside it, create text channels mirroring production: `missing`, `angry`, `logs`, `notebook-review`, `notebook-ask`, plus two new ones: `surprises`, `dates`
3. For each channel: Channel Settings → Integrations → New Webhook → copy URL

You should end up with 7 webhook URLs (corresponding to the env vars below).

### 5. Generate a separate VAPID keypair for staging

From the repo root:

```bash
npx web-push generate-vapid-keys
```

Save the public and private keys — these MUST be different from production VAPID keys so Phương's existing PWA push subscription can never accidentally receive staging notifications.

### 6. Create the staging Vercel project + set env vars

- Vercel dashboard → **New Project** → import the same GitHub repo
- Project name: `heo-masuri-staging`
- **Production branch: `staging`** (this is critical — the staging Vercel project deploys from the `staging` git branch, not `main`)
- Settings → **Deployment Protection** → enable **Vercel Authentication** or **Password Protection** (per blueprint §0.8)
- Settings → Environment Variables → paste the following (values from steps 1, 4, 5):

```
ENVIRONMENT=staging

NEXT_PUBLIC_SUPABASE_URL=<staging-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role>

DISCORD_WEBHOOK_MISSING=<staging>
DISCORD_WEBHOOK_ANGRY=<staging>
DISCORD_WEBHOOK_LOGS=<staging>
DISCORD_WEBHOOK_NOTEBOOK_REVIEW=<staging>
DISCORD_WEBHOOK_NOTEBOOK_ASK=<staging>
DISCORD_WEBHOOK_SURPRISES=<staging>
DISCORD_WEBHOOK_DATES=<staging>

VAPID_PUBLIC_KEY=<staging-vapid-pub>
VAPID_PRIVATE_KEY=<staging-vapid-priv>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same-as-VAPID_PUBLIC_KEY>
VAPID_SUBJECT=mailto:dan@example.com

NEXT_PUBLIC_APP_URL=https://heo-masuri-staging-<hash>.vercel.app
CRON_SECRET=<random-long-string, can be a fresh `openssl rand -hex 32`>
SUPABASE_STAGING_PROJECT_REF=<ref-from-step-1>
```

Wait for the first deployment to succeed (it will, on the existing `staging` commit). Then check that visiting the URL prompts you for the Vercel password — confirms protection is active.

### 7. Confirm staging works end-to-end

- Log in to staging via soft gate as `heo` (test cookie) → home page loads
- Log in as `masuri` → home page loads
- Trigger any existing Discord webhook (e.g. press the missing button) → message appears in the `[STAGING] Heo & Masuri` Discord category, prefixed with `[STAGING]`

If the `[STAGING]` prefix is missing, double-check `ENVIRONMENT=staging` is set in Vercel.

### 8. (After step 3) Enable the typed-Supabase-client ESLint rule

This step is deferred until `types/database.ts` actually exists. Once it does, ping me — I'll:
- Add the ESLint rule per blueprint §3.5 (translated for flat config `eslint.config.mjs`)
- Update existing `createClient(...)` callsites in the repo to be typed as `createClient<Database>(...)`
- Verify the rule catches an intentionally-untyped client

I'm deferring this because adding the rule before `types/database.ts` exists would make every existing untyped client fail lint immediately, blocking the build before you can do step 6.

---

## Decisions logged (for the record)

These were made during the Checkpoint 0 read-back. If you disagree with any, raise it before Phase 2A begins.

| # | Decision | Reasoning |
|---|---|---|
| Layout-1 | Keep `supabase/migrations/` (not `migrations/`). Phase 2 migrations start at `007_...` | Matches existing Supabase CLI convention |
| Layout-2 | `db/schema.sql` at repo root | Per blueprint |
| Layout-3 | `types/database.ts` (not `src/types/database.ts`) | Repo has no `src/` prefix |
| PM | Stay on npm | Existing lockfile, no reason to switch |
| Letters | `two_truths` stays in the enum. Phase 2 ADDS `'love_note'`, `'surprise'`, `'gm'`, `'gn'` via a migration | `two_truths` is in active use; `love_note` is referenced in §17.2 |
| Branch | Work on `staging` directly in `C:\Dian\QP`, no worktree | Matches existing user preference |
| Cron limit | Architect as a single `/api/cron/tick` dispatcher from the start | Safe on Hobby plan; trivial to expand if Pro |
| Co-Author | No `Co-Authored-By: Claude` lines in commits | Explicit user preference |

---

## Open questions blocking Phase 2A

None blocking — Phase 2A can start as soon as steps 1–7 above are done. Step 8 happens in parallel.

If you want me to start Phase 2A immediately on a stubbed-out staging (e.g. you've only done steps 1–3 so far), tell me and I'll do the schema-level work (write migration 007 SQL for `surprise_pool`, `surprise_deliveries`, `recurring_letters`, plus the `letters.kind` CHECK extension) without touching the cron worker yet. The cron worker waits for `CRON_SECRET` to exist in Vercel.
