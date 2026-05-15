/**
 * POST /api/notebook/admin/regenerate
 * Masuri-only. Archives the current draft and stores a hint for the Routine.
 * The Routine picks up the [MASURI_HINT] on its next run (or Masuri runs it manually).
 *
 * Body: { page_id: string, hint?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("who")?.value !== "masuri") {
    return NextResponse.json({ error: "Masuri only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { page_id, hint } = body as { page_id: string; hint?: string };

  if (!page_id) {
    return NextResponse.json({ error: "page_id required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch current page to get scheduled_for
  const { data: page, error: fetchErr } = await supabase
    .from("daily_pages")
    .select("id, scheduled_for, generation_meta")
    .eq("id", page_id)
    .single();

  if (fetchErr || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Archive the old draft
  const { error: archiveErr } = await supabase
    .from("daily_pages")
    .update({ status: "archived" })
    .eq("id", page_id);

  if (archiveErr) {
    console.error("[admin/regenerate] archive error:", archiveErr);
    return NextResponse.json({ error: archiveErr.message }, { status: 500 });
  }

  // If there's a hint, store it in a placeholder draft so read_heo_state picks it up
  if (hint?.trim()) {
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();

    if (heo) {
      await supabase.from("daily_pages").insert({
        for_user: heo.id,
        scheduled_for: page.scheduled_for,
        status: "draft",
        title_vi: "Đang tạo lại...",
        title_en: "Regenerating...",
        topic: "pending",
        difficulty: 1,
        cards: [],
        generated_by: "manual",
        generation_meta: {
          masuri_hint: hint.trim(),
          placeholder: true,
        },
      });
    }
  }

  // Send a Discord notification to trigger manual re-run
  const webhookUrl = process.env.DISCORD_WEBHOOK_NOTEBOOK_REVIEW;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Sổ tiếng Anh",
        embeds: [
          {
            title: "🔄 Masuri yêu cầu tạo lại trang",
            description:
              `Trang cho ngày **${page.scheduled_for}** đã bị archive.\n` +
              (hint ? `💬 Hint: _${hint}_\n` : "") +
              `\nChạy lại Routine để tạo trang mới.`,
            color: 0xfae8b8,
          },
        ],
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, archived: page_id, hint: hint ?? null });
}
