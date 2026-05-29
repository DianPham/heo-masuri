/**
 * GET/POST /api/cron/deliver-scheduled
 *
 * Scheduled-message delivery worker. Phase 2 §5.1.
 *
 * Finds letters with scheduled_for <= now() and delivered_at IS NULL.
 * For each: respect the recipient's quiet hours (DEFER, not skip — try again
 * next tick), otherwise mark delivered, fire push, broadcast realtime.
 *
 * Called by the cron dispatcher (/api/cron/tick) every 5 minutes via the
 * exported `runDeliverScheduled()` helper, and also exposes a Bearer-token
 * endpoint for manual triggers.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}. Vercel Cron's GET requests
 * include this header automatically when CRON_SECRET is set in the project.
 */
import { NextRequest, NextResponse } from "next/server";
import { createTypedServerClient } from "@/lib/supabase/server";
import { checkQuietHours } from "@/lib/quiet-hours";
import { sendPushToUser } from "@/lib/push";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type LetterKind = Database["public"]["Tables"]["letters"]["Row"]["kind"];

type DeliveryResult = {
  found: number;
  delivered: number;
  deferred_quiet: number;
  errors: number;
};

/**
 * Map letter kind → notification pref key + push copy.
 * Phase 1.5 kinds (weekly_letter, two_truths, etc.) generally aren't delivered
 * via the scheduled worker — they're delivered at insert time — but we handle
 * them defensively in case any existing flow ever leaves delivered_at NULL.
 */
function pushForKind(kind: LetterKind, body: string): {
  prefKey: string | null;       // null = no pref gate (always send)
  title: string;
  bodyPreview: string;
} {
  const preview = body.length > 60 ? body.slice(0, 60) + "…" : body;
  switch (kind) {
    case "surprise":
      return { prefKey: "surprise_enabled", title: "Có điều bất ngờ từ Masuri 🥰", bodyPreview: preview };
    case "love_note":
      return { prefKey: "surprise_enabled", title: "Thư từ Masuri 💌", bodyPreview: preview };
    case "gm":
      return { prefKey: "gmgn_enabled", title: "Chào buổi sáng 🌸", bodyPreview: preview };
    case "gn":
      return { prefKey: "gmgn_enabled", title: "Chúc ngủ ngon 🌙", bodyPreview: preview };
    case "weekly_letter":
    case "two_truths":
      return { prefKey: null, title: "Thư mới từ Heo 📨", bodyPreview: preview };
    case "vocab_card":
      return { prefKey: null, title: "Thiệp từ vựng mới 📖", bodyPreview: preview };
    case "encouragement":
      return { prefKey: null, title: "Lời động viên từ Masuri 💕", bodyPreview: preview };
    default:
      return { prefKey: null, title: "Thư mới 💌", bodyPreview: preview };
  }
}

/**
 * Core worker. Exported so the cron dispatcher can call it directly without
 * a self-HTTP round trip.
 */
export async function runDeliverScheduled(): Promise<DeliveryResult> {
  const supabase = createTypedServerClient();
  const result: DeliveryResult = { found: 0, delivered: 0, deferred_quiet: 0, errors: 0 };

  const nowIso = new Date().toISOString();

  // Find due-and-undelivered letters. Limit defensively in case the queue is huge.
  const { data: due, error } = await supabase
    .from("letters")
    .select("id, to_user, kind, body, scheduled_for")
    .lte("scheduled_for", nowIso)
    .is("delivered_at", null)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[deliver-scheduled] query failed", error);
    return result;
  }

  result.found = due?.length ?? 0;
  if (!due || due.length === 0) return result;

  // Process serially so a recipient with multiple due letters gets ordered pushes.
  for (const letter of due) {
    try {
      // Defer if recipient is currently in quiet hours.
      const quiet = await checkQuietHours(letter.to_user);
      if (quiet) {
        result.deferred_quiet++;
        continue;
      }

      // Mark delivered. Use .neq(...) idempotency guard so two concurrent ticks
      // can't double-deliver the same letter.
      const { data: updated, error: updateErr } = await supabase
        .from("letters")
        .update({ delivered_at: nowIso })
        .eq("id", letter.id)
        .is("delivered_at", null)
        .select("id")
        .maybeSingle();

      if (updateErr || !updated) {
        // Either DB error or another tick already delivered it
        if (updateErr) {
          console.error("[deliver-scheduled] update failed", letter.id, updateErr);
          result.errors++;
        }
        continue;
      }

      // Push (no awaiting failure — push errors don't roll back delivery).
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const { title, bodyPreview } = pushForKind(letter.kind as LetterKind, letter.body);
      await sendPushToUser(letter.to_user, {
        title,
        body: bodyPreview,
        url: `${appUrl}/heo/notebook/letter/${letter.id}`,
        tag: `letter-${letter.id}`,
      }).catch((err) => console.error("[deliver-scheduled] push failed", letter.id, err));

      // Realtime broadcast on the existing "couple" channel.
      await supabase
        .channel("couple")
        .send({
          type: "broadcast",
          event: "letter:delivered",
          payload: { letter_id: letter.id, kind: letter.kind, to_user: letter.to_user },
        })
        .catch(() => {});

      result.delivered++;
    } catch (err) {
      console.error("[deliver-scheduled] unexpected error", letter.id, err);
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

  const result = await runDeliverScheduled();
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
