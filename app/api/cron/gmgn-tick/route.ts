/**
 * GET/POST /api/cron/gmgn-tick
 *
 * Per-minute tick that delivers GM/GN auto-notes when local time matches
 * a configured `send_at_local`. Blueprint §5.3.
 *
 * Logic:
 *   1. Compute local HH:MM in the recurring schedule's timezone (currently
 *      always Asia/Ho_Chi_Minh; helper generalizes if more zones added).
 *   2. Query recurring_letters where enabled=true and send_at_local matches.
 *   3. For each match: if last_delivered_at is in the same VN day → idempotent
 *      skip. Otherwise rotate pool index, INSERT a letter row, advance state,
 *      and fire the push (sendPushIfAllowed already gates on gmgn_enabled +
 *      quiet hours).
 *
 * Idempotency: the same-day check guards against multiple tick fires within
 * the same minute or accidental re-runs.
 *
 * Auth: Bearer ${CRON_SECRET}.
 */
import { NextRequest, NextResponse } from "next/server";
import { createTypedServerClient } from "@/lib/supabase/server";
import { sendPushIfAllowed } from "@/lib/push";

export const dynamic = "force-dynamic";

type TickResult = {
  matched: number;
  delivered: number;
  skipped_same_day: number;
  errors: number;
};

/** Day key in VN (UTC+7). Matches the convention used elsewhere in the app. */
function vnDayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** Current local HH:MM:SS in the given timezone. Currently only handles VN. */
function localTimeInTz(tz: string): string {
  // For now: Asia/Ho_Chi_Minh = UTC+7 fixed offset (no DST in Vietnam).
  // If we ever add another timezone, swap to Intl.DateTimeFormat with the tz.
  if (tz !== "Asia/Ho_Chi_Minh") {
    console.warn(`[gmgn-tick] unsupported timezone ${tz}, falling back to VN`);
  }
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 3_600_000);
  const hh = vn.getUTCHours().toString().padStart(2, "0");
  const mm = vn.getUTCMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}:00`;
}

function pushTitleForKind(kind: "gm" | "gn"): string {
  return kind === "gm" ? "Chào buổi sáng 🌸" : "Chúc ngủ ngon 🌙";
}

export async function runGmgnTick(): Promise<TickResult> {
  const supabase = createTypedServerClient();
  const result: TickResult = { matched: 0, delivered: 0, skipped_same_day: 0, errors: 0 };

  // For now we ask the DB for any enabled rows matching VN current minute.
  // (If we ever add multi-tz: query all enabled, filter by per-row tz here.)
  const localNow = localTimeInTz("Asia/Ho_Chi_Minh");

  const { data: matches, error } = await supabase
    .from("recurring_letters")
    .select("id, from_user, to_user, kind, pool, send_at_local, timezone, last_delivered_at, last_pool_index")
    .eq("enabled", true)
    .eq("send_at_local", localNow);

  if (error) {
    console.error("[gmgn-tick] query failed", error);
    return result;
  }

  result.matched = matches?.length ?? 0;
  if (!matches || matches.length === 0) return result;

  const todayVN = vnDayKey(new Date());

  for (const rec of matches) {
    try {
      // Idempotent same-day skip.
      if (rec.last_delivered_at && vnDayKey(rec.last_delivered_at) === todayVN) {
        result.skipped_same_day++;
        continue;
      }

      // Validate pool shape.
      const pool = rec.pool;
      if (!Array.isArray(pool) || pool.length === 0) {
        console.warn("[gmgn-tick] empty pool, skipping", rec.id);
        result.errors++;
        continue;
      }
      const nextIndex = (rec.last_pool_index + 1) % pool.length;
      const bodyRaw = pool[nextIndex];
      if (typeof bodyRaw !== "string" || !bodyRaw.trim()) {
        console.warn("[gmgn-tick] non-string pool entry, skipping", rec.id, nextIndex);
        result.errors++;
        continue;
      }

      const nowIso = new Date().toISOString();

      // Insert the user-visible letter.
      const kind: "gm" | "gn" = rec.kind === "gn" ? "gn" : "gm";
      const { data: inserted, error: insertErr } = await supabase
        .from("letters")
        .insert({
          from_user: rec.from_user,
          to_user: rec.to_user,
          kind,
          body: bodyRaw,
          language: "vi",
          scheduled_for: nowIso,
          delivered_at: nowIso,
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        console.error("[gmgn-tick] insert letter failed", rec.id, insertErr);
        result.errors++;
        continue;
      }

      // Advance state.
      await supabase
        .from("recurring_letters")
        .update({ last_delivered_at: nowIso, last_pool_index: nextIndex })
        .eq("id", rec.id);

      // Push (pref + quiet hours gated by helper).
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      await sendPushIfAllowed(rec.to_user, "gmgn_enabled", {
        title: pushTitleForKind(kind),
        body: bodyRaw.length > 60 ? bodyRaw.slice(0, 60) + "…" : bodyRaw,
        url: `${appUrl}/heo/notebook/letter/${inserted.id}`,
        tag: `gmgn-${kind}`,
      }).catch((err) => console.error("[gmgn-tick] push failed", rec.id, err));

      // Realtime broadcast (consistent with deliver-scheduled).
      await supabase
        .channel("couple")
        .send({
          type: "broadcast",
          event: "letter:delivered",
          payload: { letter_id: inserted.id, kind, to_user: rec.to_user },
        })
        .catch(() => {});

      result.delivered++;
    } catch (err) {
      console.error("[gmgn-tick] unexpected", rec.id, err);
      result.errors++;
    }
  }

  return result;
}

async function handle(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runGmgnTick());
}

export const GET = handle;
export const POST = handle;
