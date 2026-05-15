#!/usr/bin/env npx tsx
/**
 * write_draft_page.ts
 * ─────────────────────────────────────────────────────────────
 * Validates and inserts a draft daily_page row into Supabase.
 * Used by the Claude Code Routine after generating content.
 *
 * Usage (pipe JSON from the Routine's generated content):
 *   echo '<page_json>' | npx tsx scripts/routine/write_draft_page.ts
 *   npx tsx scripts/routine/write_draft_page.ts --json '<page_json>'
 *
 * Outputs: { page_id: "uuid" } on success, exits 1 on failure.
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import readline from "readline";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ── Schema validation ─────────────────────────────────────────

const VALID_CARD_TYPES = ["intro", "word", "reading", "exercise", "ask_prompt", "completion"];
const VALID_EXERCISE_TYPES = ["word_train", "spot_imposter", "pig_says", "caption_polaroid", "sentence_remix", "two_truths"];
const VALID_TOPICS = ["greeting", "feelings", "food", "travel", "daily", "weather", "work", "review", "with_masuri"];

function validate(page: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (typeof page.scheduled_for !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(page.scheduled_for)) {
    errors.push("scheduled_for must be YYYY-MM-DD string");
  }
  if (typeof page.title_vi !== "string" || !page.title_vi.trim()) {
    errors.push("title_vi required");
  }
  if (typeof page.title_en !== "string" || !page.title_en.trim()) {
    errors.push("title_en required");
  }
  if (typeof page.topic !== "string") {
    errors.push("topic required");
  }
  if (![1, 2, 3].includes(page.difficulty as number)) {
    errors.push("difficulty must be 1, 2, or 3");
  }
  if (!Array.isArray(page.cards) || page.cards.length < 4) {
    errors.push("cards must be an array with at least 4 cards");
  } else {
    const cards = page.cards as Record<string, unknown>[];
    if (cards[0]?.type !== "intro") {
      errors.push("first card must be type 'intro'");
    }
    if (cards[cards.length - 1]?.type !== "completion") {
      errors.push("last card must be type 'completion'");
    }
    for (const [i, card] of cards.entries()) {
      if (!VALID_CARD_TYPES.includes(card.type as string)) {
        errors.push(`card[${i}] has invalid type '${card.type}'`);
      }
      if (card.type === "exercise") {
        if (!VALID_EXERCISE_TYPES.includes(card.exercise_type as string)) {
          errors.push(`card[${i}] has invalid exercise_type '${card.exercise_type}'`);
        }
      }
    }
    if (cards.length > 12) {
      errors.push(`too many cards: ${cards.length} (max 12)`);
    }
  }

  return errors;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  // Read JSON from --json flag or stdin
  let raw: string;
  const jsonFlagIndex = process.argv.indexOf("--json");

  if (jsonFlagIndex !== -1 && process.argv[jsonFlagIndex + 1]) {
    raw = process.argv[jsonFlagIndex + 1];
  } else {
    // Read from stdin
    const rl = readline.createInterface({ input: process.stdin });
    const lines: string[] = [];
    for await (const line of rl) lines.push(line);
    raw = lines.join("\n");
  }

  let page: Record<string, unknown>;
  try {
    page = JSON.parse(raw);
  } catch {
    console.error("Failed to parse JSON input");
    process.exit(1);
  }

  const errors = validate(page);
  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const e of errors) console.error(" •", e);
    process.exit(1);
  }

  // Get heo's user id
  const { data: heo } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "heo")
    .single();

  if (!heo) {
    console.error("Could not find heo user");
    process.exit(1);
  }

  // Check no existing draft for same scheduled_for
  const { data: existing } = await supabase
    .from("daily_pages")
    .select("id, status")
    .eq("for_user", heo.id)
    .eq("scheduled_for", page.scheduled_for as string)
    .neq("status", "archived")
    .maybeSingle();

  if (existing) {
    console.error(
      `A page for ${page.scheduled_for} already exists (id: ${existing.id}, status: ${existing.status}). ` +
      `Archive it first or use /api/notebook/admin/regenerate.`
    );
    process.exit(1);
  }

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
    console.error("Supabase insert failed:", error.message);
    process.exit(1);
  }

  console.log(JSON.stringify({ page_id: inserted.id }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
