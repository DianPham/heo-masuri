/**
 * POST /api/notebook/admin/notify-heo-push
 * Internal — called by publish-due cron and notify_masuri script.
 * Sends a push notification to Heo.
 * Secured by CRON_SECRET header.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, body: pushBody, url, tag } = body as {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  };

  const supabase = createServerClient();
  const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
  if (!heo) return NextResponse.json({ ok: false });

  await sendPushToUser(heo.id, { title, body: pushBody, url, tag });
  return NextResponse.json({ ok: true });
}
