/**
 * POST /api/notebook/admin/regenerate
 * Masuri-only. Archives the current draft, stores a hint, then immediately
 * fires the Claude Code Routine to regenerate the lesson — no manual trigger needed.
 *
 * Body: { page_id: string, hint?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

  // 1. Fetch current page
  const { data: page, error: fetchErr } = await supabase
    .from("daily_pages")
    .select("id, scheduled_for, generation_meta")
    .eq("id", page_id)
    .single();

  if (fetchErr || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // 2. Archive the old draft
  const { error: archiveErr } = await supabase
    .from("daily_pages")
    .update({ status: "archived" })
    .eq("id", page_id);

  if (archiveErr) {
    console.error("[admin/regenerate] archive error:", archiveErr);
    return NextResponse.json({ error: archiveErr.message }, { status: 500 });
  }

  // 3. If there's a hint, insert a placeholder draft so the Routine picks it up via [MASURI_HINT]
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

  // 4. Fire the Claude Code Routine immediately
  const routineEndpoint = process.env.CLAUDE_ROUTINE_ENDPOINT;
  const routineToken    = process.env.CLAUDE_ROUTINE_TOKEN;
  let routineFired      = false;
  let routineError: string | null = null;

  if (routineEndpoint && routineToken) {
    try {
      const routineRes = await fetch(routineEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${routineToken}`,
          "Content-Type": "application/json",
        },
      });

      if (routineRes.ok) {
        routineFired = true;
      } else {
        const errText = await routineRes.text().catch(() => "");
        routineError = `HTTP ${routineRes.status}: ${errText.slice(0, 200)}`;
        console.error("[admin/regenerate] Routine fire failed:", routineError);
      }
    } catch (err) {
      routineError = String(err);
      console.error("[admin/regenerate] Routine fire error:", routineError);
    }
  } else {
    routineError = "CLAUDE_ROUTINE_ENDPOINT or CLAUDE_ROUTINE_TOKEN not configured";
    console.warn("[admin/regenerate]", routineError);
  }

  // 5. Discord notification — status depends on whether routine fired
  const webhookUrl = process.env.DISCORD_WEBHOOK_NOTEBOOK_REVIEW;
  if (webhookUrl) {
    const statusLine = routineFired
      ? "✅ Routine đã được kích hoạt tự động — bài mới sẽ xuất hiện trong vài phút."
      : `⚠️ Routine chưa kích hoạt được (${routineError ?? "unknown error"}) — chạy thủ công nha.`;

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
              (hint ? `💬 Hint: _${hint}_\n\n` : "\n") +
              statusLine,
            color: routineFired ? 0xa8d5a2 : 0xfae8b8,
          },
        ],
      }),
    }).catch(() => {});
  }

  revalidatePath("/masuri/notebook");
  revalidatePath("/masuri/notebook/review");

  return NextResponse.json({
    ok: true,
    archived: page_id,
    hint: hint ?? null,
    routine_fired: routineFired,
    routine_error: routineError,
  });
}
