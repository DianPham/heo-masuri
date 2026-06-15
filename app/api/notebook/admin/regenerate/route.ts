/**
 * POST /api/notebook/admin/regenerate
 * Masuri-only. Archives the current draft, stores the hint IN the archived
 * page's generation_meta (no placeholder draft), then fires the Routine.
 *
 * Why no placeholder draft: a placeholder draft counted as an "unpublished lesson"
 * in the state API, inflating unpublished_count and causing the routine's early-stop
 * check (≥ 2) to trigger — so regeneration never actually happened.
 * Storing the hint on the archived page is clean and has no side effects on counts.
 *
 * Body: { page_id: string, hint?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { sendWebhook } from "@/lib/discord";
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

  // 2. Archive the page — embed the hint directly into generation_meta.
  //    This avoids creating a placeholder draft that would inflate unpublished_count
  //    and block the routine's early-stop check.
  const updatedMeta = {
    ...((page.generation_meta as object) ?? {}),
    ...(hint?.trim() ? { masuri_hint: hint.trim() } : {}),
    archived_at: new Date().toISOString(),
  };

  const { error: archiveErr } = await supabase
    .from("daily_pages")
    .update({ status: "archived", generation_meta: updatedMeta })
    .eq("id", page_id);

  if (archiveErr) {
    console.error("[admin/regenerate] archive error:", archiveErr);
    return NextResponse.json({ error: archiveErr.message }, { status: 500 });
  }

  // 3. Fire the Claude Code Routine immediately
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

  // 4. Discord notification
  {
    const statusLine = routineFired
      ? "✅ Routine đã được kích hoạt — bài mới sẽ xuất hiện trong vài phút."
      : `⚠️ Routine chưa kích hoạt được (${routineError ?? "unknown"}) — chạy thủ công nha.`;

    await sendWebhook(process.env.DISCORD_WEBHOOK_NOTEBOOK_REVIEW, {
      username: "Sổ tiếng Anh",
      embeds: [{
        title: "🔄 Masuri yêu cầu tạo lại trang",
        description:
          `Trang cho ngày **${page.scheduled_for}** đã bị archive.\n` +
          (hint?.trim() ? `💬 Hint: _${hint.trim()}_\n\n` : "\n") +
          statusLine,
        color: routineFired ? 0xa8d5a2 : 0xfae8b8,
      }],
    });
  }

  revalidatePath("/masuri/notebook");
  revalidatePath("/masuri/notebook/review");

  return NextResponse.json({
    ok: true,
    archived: page_id,
    hint: hint?.trim() ?? null,
    routine_fired: routineFired,
    routine_error: routineError,
  });
}
