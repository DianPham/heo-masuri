/**
 * POST /api/notebook/admin/notify-masuri-push
 * Internal — called by the notify_masuri.ts script.
 * Sends a push notification to Masuri about a new draft.
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
  const { page_id, title_vi } = body as { page_id: string; title_vi: string };

  const supabase = createServerClient();
  const { data: masuri } = await supabase.from("users").select("id").eq("slug", "masuri").single();
  if (!masuri) return NextResponse.json({ ok: false });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await sendPushToUser(masuri.id, {
    title: "📓 Trang ngày mai cần duyệt",
    body: title_vi ?? "Mở app để duyệt nhanh nha",
    url: `${appUrl}/m/notebook/approve/${page_id}`,
    tag: "notebook-review",
  });

  return NextResponse.json({ ok: true });
}
