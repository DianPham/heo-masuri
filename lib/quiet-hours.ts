/**
 * Quiet-hours predicate, used by Phase 2 schedule workers.
 *
 * Existing Phase 1.5 push code (sendPushIfAllowed in lib/push.ts) bundles the
 * quiet-hours check with the actual send. The delivery worker (§5.1) needs a
 * standalone predicate so it can DEFER letters (leave delivered_at NULL,
 * retry next tick) rather than skip them outright.
 */
import { createTypedServerClient } from "@/lib/supabase/server";

/**
 * Returns true if the recipient is currently within their quiet-hours window.
 * Defaults to false when:
 *   - no notification_prefs row exists for the user
 *   - quiet_start or quiet_end is null
 *   - DB lookup fails
 *
 * The window is interpreted in the user's timezone (currently always
 * Asia/Ho_Chi_Minh / UTC+7 — generalize later if we add other zones).
 */
export async function checkQuietHours(userId: string): Promise<boolean> {
  try {
    const supabase = createTypedServerClient();
    const { data: prefs } = await supabase
      .from("notification_prefs")
      .select("quiet_start, quiet_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (!prefs || !prefs.quiet_start || !prefs.quiet_end) return false;

    const now = new Date();
    const hh = (now.getUTCHours() + 7) % 24; // UTC+7
    const mm = now.getUTCMinutes();
    const nowMins = hh * 60 + mm;

    const [qsh, qsm] = prefs.quiet_start.split(":").map(Number);
    const [qeh, qem] = prefs.quiet_end.split(":").map(Number);
    const startMins = qsh * 60 + qsm;
    const endMins = qeh * 60 + qem;

    // Window may cross midnight (e.g. 22:00 → 07:00)
    return startMins < endMins
      ? nowMins >= startMins && nowMins < endMins
      : nowMins >= startMins || nowMins < endMins;
  } catch {
    return false;
  }
}
