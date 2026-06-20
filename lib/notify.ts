/**
 * notifyPartner — single entry point for "the other person did something on a
 * shared feature" notifications. Phase 2 §8.
 *
 * Sends BOTH channels, best-effort, never throwing (a notification failure must
 * never fail the underlying mutation):
 *
 *   1. Push  — durable. Delivered even when the partner's app is closed.
 *              Respects notification_prefs + quiet hours via sendPushIfAllowed.
 *   2. In-app — live. Broadcast on the shared "couple" realtime channel; the
 *              <ActivityToast> client (mounted in RealtimeProvider) shows a
 *              transient toast when the app is open. Filtered by actor_slug so
 *              the actor never sees their own action echoed back.
 *
 * The in-app channel is fire-only (no persistence / replay) — push is the
 * durable record. That keeps this lightweight: no new tables, no unseen-state
 * bookkeeping per feature.
 */
import { createServerClient } from "@/lib/supabase/server";
import { sendPushIfAllowed, type PrefKey } from "@/lib/push";

type NotifyContent = {
  push: { title: string; body: string; url?: string; tag?: string };
  /** Live in-app toast payload. */
  activity: { icon: string; message: string; url?: string };
};

type NotifyArgs = {
  /** The user who performed the action — they will NOT be notified. */
  actorId: string;
  /** notification_prefs column gating the push. */
  prefKey: PrefKey;
  /**
   * Build the copy from the actor's display name (resolved here, so callers
   * don't re-query the users table just to say "Heo did X").
   */
  build: (actorName: string) => NotifyContent;
};

/** Actor's display name from slug. */
export function actorName(slug: string | null | undefined): string {
  return slug === "masuri" ? "Masuri" : "Heo";
}

export async function notifyPartner(args: NotifyArgs): Promise<void> {
  try {
    const supabase = createServerClient();
    const { data: users } = await supabase.from("users").select("id, slug");
    const all = (users ?? []) as { id: string; slug: string }[];
    const actor = all.find((u) => u.id === args.actorId);
    const partner = all.find((u) => u.id !== args.actorId);
    if (!partner) return;

    const content = args.build(actorName(actor?.slug));

    // 1) Push (durable) — respects prefs + quiet hours.
    try {
      await sendPushIfAllowed(partner.id, args.prefKey, content.push);
    } catch (e) {
      console.error("[notifyPartner push]", e);
    }

    // 2) In-app live toast — broadcast on the shared couple channel. Mirrors
    //    the proven server-side broadcast pattern used by scheduled_date PATCH.
    try {
      const channel = supabase.channel("couple");
      await channel.send({
        type: "broadcast",
        event: "activity:new",
        payload: {
          actor_slug: actor?.slug ?? null,
          icon: content.activity.icon,
          message: content.activity.message,
          url: content.activity.url ?? null,
        },
      });
      await supabase.removeChannel(channel);
    } catch (e) {
      console.error("[notifyPartner broadcast]", e);
    }
  } catch (e) {
    console.error("[notifyPartner]", e);
  }
}
