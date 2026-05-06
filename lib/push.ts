import webpush from "web-push";
import { createServerClient } from "@/lib/supabase/server";

let vapidInitialized = false;
function ensureVapid() {
  if (vapidInitialized) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.warn("[push] VAPID keys not configured — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:example@example.com",
    pub,
    priv
  );
  vapidInitialized = true;
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureVapid();
  if (!vapidInitialized) return;
  const supabase = createServerClient();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const notif = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notif
        );
      } catch (err: unknown) {
        // Remove stale subscriptions (410 Gone)
        if (err && typeof err === "object" && "statusCode" in err && err.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    })
  );
}

export type PrefKey = "missing_enabled" | "thinking_enabled" | "hug_kiss_enabled" | "angry_enabled";

// Check pref + quiet hours before sending. Default to allow when no prefs row exists.
export async function sendPushIfAllowed(
  userId: string,
  prefKey: PrefKey,
  payload: PushPayload
) {
  const supabase = createServerClient();
  const { data: prefs } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", userId)
    .single();

  // No prefs row — default to sending; only block if row exists and pref is false
  if (prefs && !prefs[prefKey]) return;

  if (prefs && prefs.quiet_start && prefs.quiet_end) {
    const now = new Date();
    const hh = now.getUTCHours() + 7; // UTC+7
    const mm = now.getUTCMinutes();
    const nowMins = (hh % 24) * 60 + mm;

    const [qsh, qsm] = (prefs.quiet_start as string).split(":").map(Number);
    const [qeh, qem] = (prefs.quiet_end as string).split(":").map(Number);
    const startMins = qsh * 60 + qsm;
    const endMins = qeh * 60 + qem;

    const inQuiet =
      startMins < endMins
        ? nowMins >= startMins && nowMins < endMins
        : nowMins >= startMins || nowMins < endMins;

    if (inQuiet) return;
  }

  await sendPushToUser(userId, payload);
}

// Like sendPushIfAllowed but ignores quiet hours.
// Used for angry buzzes to Masuri — his partner's distress overrides his sleep schedule.
// Quiet hours still apply to all other channels.
export async function sendPushIgnoringQuietHours(
  userId: string,
  prefKey: PrefKey,
  payload: PushPayload
) {
  const supabase = createServerClient();
  const { data: prefs } = await supabase
    .from("notification_prefs")
    .select(prefKey)
    .eq("user_id", userId)
    .single();

  // No prefs row — default to sending; only block if row exists and pref is false
  if (prefs && !prefs[prefKey]) return;

  await sendPushToUser(userId, payload);
}
