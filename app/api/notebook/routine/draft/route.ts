/**
 * POST /api/notebook/routine/draft
 * Validates + saves a generated daily page as a draft, then notifies Masuri.
 * Called by the Claude Code Routine after generating content.
 * Secured by CRON_SECRET.
 *
 * Body: the full page JSON — English track in `cards`, optional Chinese track
 * in `title_zh` + `cards_zh` (see scripts/routine/ROUTINE_PROMPT.md).
 */
import { NextRequest, NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { sendWebhook } from "@/lib/discord";
import { validateEnCards, validateZhCards } from "@/lib/notebook/validate-lesson";
import { prepareLessonAudio } from "@/lib/tts";

export const dynamic = "force-dynamic";
// Room for voicing the lesson after the response (see after() below)
export const maxDuration = 60;

function validate(page: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (typeof page.scheduled_for !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(page.scheduled_for))
    errors.push("scheduled_for must be YYYY-MM-DD");
  if (!page.title_vi) errors.push("title_vi required");
  if (!page.title_en) errors.push("title_en required");
  if (!page.topic) errors.push("topic required");
  if (![1, 2, 3].includes(page.difficulty as number)) errors.push("difficulty must be 1-3");
  errors.push(...validateEnCards(page.cards));
  // Chinese track is optional (the lesson still works in English without it,
  // and zh-backfill can add it later) — but if sent, it must be complete.
  if (page.cards_zh != null) {
    if (typeof page.title_zh !== "string" || !page.title_zh.trim())
      errors.push("title_zh required when cards_zh is sent");
    errors.push(...validateZhCards(page.cards_zh));
  }
  return errors;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = await req.json().catch(() => null);
  if (!page) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const errors = validate(page);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
  const { data: masuri } = await supabase
    .from("users")
    .select("id, display_name")
    .eq("slug", "masuri")
    .single();

  if (!heo || !masuri) {
    return NextResponse.json({ error: "Users not found" }, { status: 500 });
  }

  // ── Server-side buffer guard ─────────────────────────────────────────────
  // Reject if the requested scheduled_for date is already covered, or if
  // MAX_BUFFER future slots are already filled (prevents duplicate creation
  // when the routine is run multiple times).
  const MAX_BUFFER = 2;
  const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const tomorrowVN = new Date(Date.now() + 7 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);

  const { data: existingQueued } = await supabase
    .from("daily_pages")
    .select("scheduled_for, generation_meta")
    .eq("for_user", heo.id)
    .in("status", ["draft", "approved", "published"])
    .gte("scheduled_for", tomorrowVN)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_BUFFER + 5);

  // Exclude legacy placeholder drafts from the buffer check (same as state API)
  const queuedDates = new Set(
    (existingQueued ?? [])
      .filter((p) => {
        const meta = p.generation_meta as Record<string, unknown> | null;
        return meta?.placeholder !== true;
      })
      .map((p) => String(p.scheduled_for).slice(0, 10))
  );

  // Reject if this specific date is already covered
  const requestedDate = String(page.scheduled_for).slice(0, 10);
  if (queuedDates.has(requestedDate)) {
    return NextResponse.json(
      { error: `Date ${requestedDate} already has a queued lesson. Skipping.`, already_queued: true },
      { status: 409 }
    );
  }

  // Reject if the date is in the past or today (must be a future date)
  if (requestedDate <= todayVN) {
    return NextResponse.json(
      { error: `scheduled_for must be a future date (got ${requestedDate}, today is ${todayVN})` },
      { status: 400 }
    );
  }

  // Reject if buffer is already full (MAX_BUFFER future slots are all covered)
  let bufferFull = true;
  for (let i = 1; i <= MAX_BUFFER; i++) {
    const candidate = new Date(Date.now() + 7 * 3_600_000 + i * 86_400_000)
      .toISOString()
      .slice(0, 10);
    if (!queuedDates.has(candidate)) { bufferFull = false; break; }
  }
  if (bufferFull) {
    return NextResponse.json(
      { error: "Buffer full — already have lessons queued for the next 2 days.", buffer_full: true },
      { status: 409 }
    );
  }
  // ── End buffer guard ─────────────────────────────────────────────────────

  // Delete any legacy placeholder drafts for this date before inserting the real one.
  // Old regenerate flow created placeholder drafts with generation_meta.placeholder=true
  // that would cause a 409 duplicate-date rejection here. We delete (not archive) them
  // because they were never real lessons — the hint now lives on the archived original.
  await supabase
    .from("daily_pages")
    .delete()
    .eq("for_user", heo.id)
    .eq("scheduled_for", page.scheduled_for)
    .eq("status", "draft")
    .filter("generation_meta->>placeholder", "eq", "true");

  // Insert the new draft
  const { data: inserted, error } = await supabase
    .from("daily_pages")
    .insert({
      for_user: heo.id,
      scheduled_for: page.scheduled_for,
      status: "draft",
      title_vi: page.title_vi,
      title_en: page.title_en,
      topic: page.topic,
      difficulty: page.difficulty,
      cards: page.cards,
      title_zh: page.cards_zh != null ? page.title_zh : null,
      cards_zh: page.cards_zh ?? null,
      generated_by: "routine",
      generation_meta: {
        ...(typeof page.generation_meta === "object" ? page.generation_meta : {}),
        routine_run_id: `run_${Date.now()}`,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[routine/draft]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pageId = inserted.id;

  // Voice every word/sentence of both tracks now, so Heo's taps play stored audio
  after(() => prepareLessonAudio(pageId));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const approveUrl = `${appUrl}/m/notebook/approve/${pageId}`;

  // Discord webhook
  {
    const meta = page.generation_meta as Record<string, unknown> ?? {};
    const newVocab: string[] = Array.isArray(meta.new_vocab) ? meta.new_vocab as string[] : [];
    const cardCount = (page.cards as unknown[]).length;

    await sendWebhook(process.env.DISCORD_WEBHOOK_NOTEBOOK_REVIEW, {
      username: "Sổ tiếng Anh",
      embeds: [{
        title: "📓 Trang ngày mai sẵn sàng",
        description:
          `**${page.title_vi}** / ${page.title_en}\n` +
          `Topic: \`${page.topic}\` • Độ khó: ${page.difficulty}/3\n` +
          `${cardCount} thẻ` +
          (page.cards_zh != null ? ` • 🇨🇳 ${page.title_zh}` : " • ⚠️ chưa có bản tiếng Trung") +
          (newVocab.length > 0 ? ` • Từ mới: _${newVocab.join(", ")}_` : "") +
          `\n\n[👀 Duyệt nhanh](${approveUrl})`,
        color: 0xf8b4c4,
        fields: [{ name: "Ngày", value: page.scheduled_for, inline: true }],
      }],
    });
  }

  // Push to Masuri
  await sendPushToUser(masuri.id, {
    title: "📓 Trang ngày mai cần duyệt",
    body: `${page.title_vi} — mở app duyệt nhanh nha`,
    url: approveUrl,
    tag: "notebook-review",
  });

  revalidatePath("/masuri/notebook");
  return NextResponse.json({ page_id: pageId, approve_url: approveUrl });
}
