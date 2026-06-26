/**
 * GET /api/push/debug?token=<CRON_SECRET>[&to=heo|masuri][&send=1]
 *
 * TEMPORARY diagnostic — reports the deployed server's VAPID config + (with
 * send=1) attempts a real push to the target user's subscriptions and returns
 * each push service's status code. Lets us tell, from inside the running prod
 * deployment, whether VAPID env is set and whether sends are accepted.
 *
 * Guarded by CRON_SECRET. Remove after debugging.
 */
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pub = process.env.VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  const npub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "";

  const report: Record<string, unknown> = {
    vapid_public_set: Boolean(pub),
    vapid_public_len: pub.length,
    vapid_public_prefix: pub.slice(0, 16),
    vapid_private_set: Boolean(priv),
    vapid_private_len: priv.length,
    next_public_vapid_set: Boolean(npub),
    next_public_vapid_prefix: npub.slice(0, 16),
    next_public_matches_server: npub === pub,
    vapid_subject: subject || null,
    supabase_url_host: (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
      } catch {
        return null;
      }
    })(),
  };

  const sendTo = req.nextUrl.searchParams.get("to");
  if (req.nextUrl.searchParams.get("send") === "1" && (sendTo === "heo" || sendTo === "masuri")) {
    if (!pub || !priv) {
      report.send = "skipped — VAPID keys not configured on this deployment";
      return NextResponse.json(report);
    }
    try {
      webpush.setVapidDetails(subject || "mailto:test@example.com", pub, priv);
    } catch (e) {
      report.send = `setVapidDetails threw: ${String(e)}`;
      return NextResponse.json(report);
    }

    const supabase = createServerClient();
    const { data: user } = await supabase.from("users").select("id").eq("slug", sendTo).single();
    if (!user) {
      report.send = "user not found";
      return NextResponse.json(report);
    }
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user.id);
    report.subscription_count = subs?.length ?? 0;

    const results: { status: number | string; endpoint: string }[] = [];
    for (const s of subs ?? []) {
      try {
        const r = await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: "Push debug 🔔", body: "test from /api/push/debug", tag: "debug" })
        );
        results.push({ status: r.statusCode, endpoint: s.endpoint.slice(0, 50) });
      } catch (e: unknown) {
        const err = e as { statusCode?: number; body?: string; message?: string };
        results.push({
          status: err.statusCode ?? `err:${err.message}`,
          endpoint: s.endpoint.slice(0, 50),
        });
      }
    }
    report.send_results = results;
  }

  return NextResponse.json(report);
}
