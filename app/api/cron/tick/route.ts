/**
 * GET/POST /api/cron/tick
 *
 * The single Vercel-registered cron entry. Runs every minute and fans out to
 * the per-feature workers based on the current UTC time.
 *
 * Why one endpoint: Vercel Hobby plan caps cron entries at 2; Phase 2 brings
 * total scheduled work to 5 distinct cadences (deliver-scheduled every 5min,
 * surprise-tick hourly, gmgn-tick every minute, reminder daily 13:00 UTC,
 * publish-due daily 23:00 UTC). Folding everything behind one cron stays
 * under the limit and makes the schedule logic explicit + testable in one place.
 *
 * Internal high-frequency calls (deliver-scheduled and the upcoming gmgn /
 * surprise ticks) call exported handler functions directly. Daily legacy
 * routes (reminder, publish-due) are reached via self-HTTP with the same
 * CRON_SECRET so they don't need refactoring in CP1.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}.
 */
import { NextRequest, NextResponse } from "next/server";
import { runDeliverScheduled } from "@/app/api/cron/deliver-scheduled/route";
import { runGmgnTick } from "@/app/api/cron/gmgn-tick/route";

export const dynamic = "force-dynamic";

type TickResult = {
  utc: string;
  ran: string[];
  results: Record<string, unknown>;
  errors: Record<string, string>;
};

async function selfFetch(path: string, secret: string): Promise<unknown> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL not configured");
  const res = await fetch(`${appUrl}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) {
    throw new Error(`${path} returned ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json().catch(() => ({}));
}

async function handle(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const utcMinute = now.getUTCMinutes();
  const utcHour = now.getUTCHours();

  const result: TickResult = {
    utc: now.toISOString(),
    ran: [],
    results: {},
    errors: {},
  };

  // ── Every minute: GM / GN auto-notes ──────────────────────────────────────
  try {
    const r = await runGmgnTick();
    result.ran.push("gmgn-tick");
    result.results["gmgn-tick"] = r;
  } catch (err) {
    result.errors["gmgn-tick"] = String(err);
  }

  // ── Every 5 minutes: deliver scheduled letters ────────────────────────────
  if (utcMinute % 5 === 0) {
    try {
      const r = await runDeliverScheduled();
      result.ran.push("deliver-scheduled");
      result.results["deliver-scheduled"] = r;
    } catch (err) {
      result.errors["deliver-scheduled"] = String(err);
    }
  }

  // ── Daily 13:00 UTC (20:00 VN): study reminder ────────────────────────────
  if (utcHour === 13 && utcMinute === 0) {
    try {
      result.results["reminder"] = await selfFetch("/api/cron/reminder", secret);
      result.ran.push("reminder");
    } catch (err) {
      result.errors["reminder"] = String(err);
    }
  }

  // ── Daily 23:00 UTC (06:00 VN next day): publish oldest queued lesson ─────
  if (utcHour === 23 && utcMinute === 0) {
    try {
      result.results["publish-due"] = await selfFetch(
        "/api/notebook/admin/publish-due",
        secret
      );
      result.ran.push("publish-due");
    } catch (err) {
      result.errors["publish-due"] = String(err);
    }
  }

  // ── Future hooks (CP3+) ───────────────────────────────────────────────────
  // Every hour at :00:    runSurpriseTick()
  // Daily 09:00 VN:       runImportantDateTick()  (Phase 2B)

  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
