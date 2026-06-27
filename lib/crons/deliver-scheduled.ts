/**
 * Scheduled-message delivery worker logic.
 *
 * Lives in lib/ instead of inside the route file because Next.js App Router
 * rejects non-handler exports from `route.ts` at build time. The route file
 * (app/api/cron/deliver-scheduled/route.ts) is a thin handler that delegates
 * here; the dispatcher (app/api/cron/tick/route.ts) imports `runDeliverScheduled`
 * directly to avoid a self-HTTP round trip.
 *
 * Blueprint §5.1.
 */
import { createTypedServerClient } from "@/lib/supabase/server";
import { checkQuietHours } from "@/lib/quiet-hours";
import { sendPushToUser } from "@/lib/push";
import type { Database } from "@/types/database";

type LetterKind = Database["public"]["Tables"]["letters"]["Row"]["kind"];

export type DeliveryResult = {
  found: number;
  delivered: number;
  deferred_quiet: number;
  errors: number;
};

/**
 * Map letter kind → push title + body preview.
 *
 * Phase 1.5 kinds (weekly_letter, two_truths, etc.) generally aren't delivered
 * via the scheduled worker — they're delivered at insert time — but we handle
 * them defensively in case any flow ever leaves delivered_at NULL.
 */
function pushForKind(kind: LetterKind, body: string): {
  title: string;
  bodyPreview: string;
} {
  const preview = body.length > 60 ? body.slice(0, 60) + "…" : body;
  switch (kind) {
    case "surprise":
      return { title: "Có điều bất ngờ từ Masuri 🥰", bodyPreview: preview };
    case "love_note":
      return { title: "Thư từ Masuri 💌", bodyPreview: preview };
    case "gm":
      return { title: "Chào buổi sáng 🌸", bodyPreview: preview };
    case "gn":
      return { title: "Chúc ngủ ngon 🌙", bodyPreview: preview };
    case "weekly_letter":
    case "two_truths":
      return { title: "Thư mới từ Heo 📨", bodyPreview: preview };
    case "vocab_card":
      return { title: "Thiệp từ vựng mới 📖", bodyPreview: preview };
    case "encouragement":
      return { title: "Lời động viên từ Masuri 💕", bodyPreview: preview };
    default:
      return { title: "Thư mới 💌", bodyPreview: preview };
  }
}

export async function runDeliverScheduled(): Promise<DeliveryResult> {
  const supabase = createTypedServerClient();
  const result: DeliveryResult = { found: 0, delivered: 0, deferred_quiet: 0, errors: 0 };

  const nowIso = new Date().toISOString();

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

  for (const letter of due) {
    try {
      // Defer if recipient is in quiet hours — retry next tick.
      const quiet = await checkQuietHours(letter.to_user);
      if (quiet) {
        result.deferred_quiet++;
        continue;
      }

      // Atomic delivered_at flip — second concurrent tick will find delivered_at
      // already non-null and update zero rows.
      const { data: updated, error: updateErr } = await supabase
        .from("letters")
        .update({ delivered_at: nowIso })
        .eq("id", letter.id)
        .is("delivered_at", null)
        .select("id")
        .maybeSingle();

      if (updateErr || !updated) {
        if (updateErr) {
          console.error("[deliver-scheduled] update failed", letter.id, updateErr);
          result.errors++;
        }
        continue;
      }

      const { title, bodyPreview } = pushForKind(letter.kind as LetterKind, letter.body);
      await sendPushToUser(letter.to_user, {
        title,
        body: bodyPreview,
        url: `/heo/notebook/letter/${letter.id}`,
        tag: `letter-${letter.id}`,
      }).catch((err) => console.error("[deliver-scheduled] push failed", letter.id, err));

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
