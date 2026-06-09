# Phase 2 — external cron pinger setup

We decided to use a free external pinger to hit `/api/cron/tick` every minute
instead of upgrading Vercel to Pro. This doc captures the setup steps and
the watchpoints.

**Recommended service: [cron-job.org](https://cron-job.org)** — free, simple
UI, custom headers, no rate cap on the free tier at 1-min intervals.

---

## What gets pinged

`POST https://<staging-or-prod-url>/api/cron/tick`

The endpoint requires `Authorization: Bearer ${CRON_SECRET}`. Without it,
returns 401 (verified, see staging smoke test in `PHASE2_TESTS.md`).

Internally, the dispatcher fans out:

| Sub-tick | Fires when | What it does |
|---|---|---|
| `runGmgnTick()` | every call | Inserts GM/GN letters whose `send_at_local` matches "now" in VN |
| `runDeliverScheduled()` | `utcMinute % 5 === 0` | Delivers due-and-undelivered letters, defers in quiet hours |
| `runSurpriseTick()` | (CP-future) | Shuffle-bag selector for surprise drops |
| `/api/cron/reminder` | `utcHour === 13 && utcMinute === 0` | Daily reminder (also registered in `vercel.json` as belt-and-suspenders) |
| `/api/notebook/admin/publish-due` | `utcHour === 23 && utcMinute === 0` | Daily lesson publish (also in `vercel.json`) |

Belt-and-suspenders note: `vercel.json` still registers the two daily Phase 1.5
crons directly. If the external pinger ever goes down, those two still run.
The Phase 2A features (GM/GN, scheduled delivery) only have the pinger;
they'll go silent if the pinger fails.

---

## Setup steps (one-time, ~5 min)

### 1. Create cron-job.org account

Sign up at https://cron-job.org. Free tier is enough.

### 2. Create the staging job

- **Title:** `heo-masuri staging tick`
- **URL:** `https://heo-masuri-staging.vercel.app/api/cron/tick`
- **Schedule:** Every 1 minute (`* * * * *` — UI usually has a "every 1 min" preset)
- **Request method:** `GET`
- **Custom headers (Advanced section):**
  - Header name: `Authorization`
  - Header value: `Bearer <paste-staging-CRON_SECRET-here>`
- **Save**

To get the staging `CRON_SECRET`: it's set in Vercel (`heo-masuri-staging` →
Settings → Environment Variables → `CRON_SECRET`). Click the eye to reveal.

### 3. Verify it's firing

- Open the cron-job.org dashboard → click the job → see the execution history
- Each call should return HTTP 200 with body like
  `{"utc":"…","ran":["gmgn-tick"],"results":{…},"errors":{}}`
- If you see 401, the Authorization header is wrong
- If you see 500, check Vercel function logs for the failing sub-tick

### 4. Repeat for production (later)

Once Phase 2 is ready to merge to `main`, create a second cron-job.org job
pointing at `https://heo-masuri.vercel.app/api/cron/tick` with the
**production** `CRON_SECRET` (different value from staging — verified
earlier in setup so each environment has its own).

Both jobs can live under the same cron-job.org account.

---

## Failure mode awareness

- **cron-job.org outage**: GM/GN won't send, scheduled letters pile up in
  the queue undelivered. Catches up on the next successful fire — no data
  is lost, just delayed.
- **Wrong CRON_SECRET in the header**: every call returns 401, nothing
  fires. Check the execution history before assuming the cron logic broke.
- **Vercel function cold start timeout**: the tick endpoint runs all
  sub-ticks serially; if a sub-tick stalls, others get delayed. For now
  the workload is small enough that this isn't a concern (each tick
  finishes in well under 10s). If we ever cross that, parallelize via
  `Promise.allSettled` in `app/api/cron/tick/route.ts`.

---

## Things that should NOT happen

- The pinger should never hit `/api/cron/deliver-scheduled` or
  `/api/cron/gmgn-tick` directly — those are exposed for manual testing.
  The dispatcher does the time-gating; calling sub-ticks directly bypasses
  that.
- Pinger interval should never go below 1 minute. The GM/GN tick scans
  `recurring_letters` every fire; sub-minute fires would waste DB cycles
  for zero benefit (the smallest time unit in the schedule is 1 minute).
