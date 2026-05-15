/**
 * POST /api/notebook/routine/draft
 * Validates + saves a generated daily page as a draft, then notifies Masuri.
 * Called by the Claude Code Routine after generating content.
 * Secured by CRON_SECRET.
 *
 * Body: the full page JSON (same schema as write_draft_page.ts)
 */
import { NextRequest, NextResponse } from "next/server";
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
      if (card.type === "exercise" && !VALID_EXERCISE_TYPES.includes(card.exercise_type as string))
        errors.push(`card[${i}] invalid exercise_type '${card.exercise_type}'`);
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

  return NextResponse.json({ page_id: pageId, approve_url: approveUrl });
}
