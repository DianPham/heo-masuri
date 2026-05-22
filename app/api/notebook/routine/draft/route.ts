/**
 * POST /api/notebook/routine/draft
 * Validates + saves a generated daily page as a draft, then notifies Masuri.
 * Called by the Claude Code Routine after generating content.
 * Secured by CRON_SECRET.
 *
 * Body: the full page JSON (same schema as write_draft_page.ts)
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

const VALID_CARD_TYPES = ["intro", "word", "reading", "exercise", "ask_prompt", "completion"];
const VALID_EXERCISE_TYPES = ["word_train", "spot_imposter", "pig_says", "caption_polaroid", "sentence_remix", "two_truths"];

function validate(page: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (typeof page.scheduled_for !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(page.scheduled_for))
    errors.push("scheduled_for must be YYYY-MM-DD");
  if (!page.title_vi) errors.push("title_vi required");
  if (!page.title_en) errors.push("title_en required");
  if (!page.topic) errors.push("topic required");
  if (![1, 2, 3].includes(page.difficulty as number)) errors.push("difficulty must be 1-3");
  if (!Array.isArray(page.cards) || page.cards.length < 4) errors.push("cards must have at least 4 items");
  else {
    const cards = page.cards as Record<string, unknown>[];
    if (cards[0]?.type !== "intro") errors.push("first card must be intro");
    if (cards[cards.length - 1]?.type !== "completion") errors.push("last card must be completion");
    if (cards.length > 12) errors.push("too many cards (max 12)");
    for (const [i, card] of cards.entries()) {
      if (!VALID_CARD_TYPES.includes(card.type as string))
        errors.push(`card[${i}] invalid type '${card.type}'`);
      if (card.type === "exercise") {
        if (!VALID_EXERCISE_TYPES.includes(card.exercise_type as string))
          errors.push(`card[${i}] invalid exercise_type '${card.exercise_type}'`);
        // Validate required data fields per exercise type — prevents silent blank renders
        const d = card.data as Record<string, unknown> | null | undefined;
        if (!d) { errors.push(`card[${i}] exercise missing data object`); }
        else switch (card.exercise_type) {
          case "word_train":
            if (!d.target_sentence_en) errors.push(`card[${i}] word_train: missing target_sentence_en`);
            if (!Array.isArray(d.shuffled_words) || (d.shuffled_words as unknown[]).length === 0)
              errors.push(`card[${i}] word_train: missing/empty shuffled_words array`);
            if (!d.hint_vi) errors.push(`card[${i}] word_train: missing hint_vi`);
            break;
          case "spot_imposter":
            if (!d.sentence_en) errors.push(`card[${i}] spot_imposter: missing sentence_en`);
            if (!d.imposter_word) errors.push(`card[${i}] spot_imposter: missing imposter_word`);
            if (!d.correct_word) errors.push(`card[${i}] spot_imposter: missing correct_word`);
            if (!d.hint_vi) errors.push(`card[${i}] spot_imposter: missing hint_vi`);
            break;
          case "pig_says":
            if (!d.prompt_vi) errors.push(`card[${i}] pig_says: missing prompt_vi`);
            if (!d.target_en) errors.push(`card[${i}] pig_says: missing target_en`);
            break;
          case "caption_polaroid":
            if (!d.image_emoji) errors.push(`card[${i}] caption_polaroid: missing image_emoji`);
            if (!Array.isArray(d.starter_words))
              errors.push(`card[${i}] caption_polaroid: missing starter_words array`);
            if (!d.example_en) errors.push(`card[${i}] caption_polaroid: missing example_en`);
            break;
          case "sentence_remix":
            if (!d.base_en) errors.push(`card[${i}] sentence_remix: missing base_en`);
            if (!d.base_vi) errors.push(`card[${i}] sentence_remix: missing base_vi`);
            if (!d.instruction_vi) errors.push(`card[${i}] sentence_remix: missing instruction_vi`);
            if (!d.target_en) errors.push(`card[${i}] sentence_remix: missing target_en`);
            if (!Array.isArray(d.hint_words)) errors.push(`card[${i}] sentence_remix: missing hint_words array`);
            break;
          case "two_truths":
            if (!d.prompt_vi) errors.push(`card[${i}] two_truths: missing prompt_vi`);
            if (!Array.isArray(d.starter_words)) errors.push(`card[${i}] two_truths: missing starter_words array`);
            break;
        }
      }
    }
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
    .select("scheduled_for")
    .eq("for_user", heo.id)
    .in("status", ["draft", "approved", "published"])
    .gte("scheduled_for", tomorrowVN)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_BUFFER + 1);

  const queuedDates = new Set(
    (existingQueued ?? []).map((p) => String(p.scheduled_for).slice(0, 10))
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

  // Archive any existing placeholder draft for this date (from a prior regenerate)
  await supabase
    .from("daily_pages")
    .update({ status: "archived" })
    .eq("for_user", heo.id)
    .eq("scheduled_for", page.scheduled_for)
    .eq("status", "draft");

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const approveUrl = `${appUrl}/m/notebook/approve/${pageId}`;

  // Discord webhook
  const webhookUrl = process.env.DISCORD_WEBHOOK_NOTEBOOK_REVIEW;
  if (webhookUrl) {
    const meta = page.generation_meta as Record<string, unknown> ?? {};
    const newVocab: string[] = Array.isArray(meta.new_vocab) ? meta.new_vocab as string[] : [];
    const cardCount = (page.cards as unknown[]).length;

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Sổ tiếng Anh",
        embeds: [{
          title: "📓 Trang ngày mai sẵn sàng",
          description:
            `**${page.title_vi}** / ${page.title_en}\n` +
            `Topic: \`${page.topic}\` • Độ khó: ${page.difficulty}/3\n` +
            `${cardCount} thẻ` +
            (newVocab.length > 0 ? ` • Từ mới: _${newVocab.join(", ")}_` : "") +
            `\n\n[👀 Duyệt nhanh](${approveUrl})`,
          color: 0xf8b4c4,
          fields: [{ name: "Ngày", value: page.scheduled_for, inline: true }],
        }],
      }),
    }).catch(() => {});
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
