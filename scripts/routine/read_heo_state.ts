#!/usr/bin/env npx tsx
/**
 * read_heo_state.ts
 * ─────────────────────────────────────────────────────────────
 * Reads Heo's current learning state from Supabase and prints
 * JSON to stdout. Used by the Claude Code Routine before
 * generating tomorrow's daily page.
 *
 * Usage:
 *   npx tsx scripts/routine/read_heo_state.ts
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  // 1. Get Heo's user id
  const { data: heo, error: heoErr } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "heo")
    .single();

  if (heoErr || !heo) {
    console.error("Could not find heo user:", heoErr?.message);
    process.exit(1);
  }

  const heoId = heo.id;

  // 2. Last 7 published pages (to avoid repeating topics)
  const { data: lastPages } = await supabase
    .from("daily_pages")
    .select("id, title_vi, title_en, topic, difficulty, scheduled_for")
    .eq("for_user", heoId)
    .eq("status", "published")
    .order("scheduled_for", { ascending: false })
    .limit(7);

  // 3. Recent 30 vocab words (recognition is rewarding — reuse them)
  const { data: recentVocab } = await supabase
    .from("vocabulary")
    .select("word_en, word_vi, pos, source_page_topic, self_confidence, review_count, last_reviewed_at")
    .eq("user_id", heoId)
    .order("saved_at", { ascending: false })
    .limit(30);

  // 4. Low-confidence words (she wants to see again)
  const lowConfidenceVocab =
    recentVocab?.filter((w) => w.self_confidence < 0) ?? [];

  // 5. Preferred topics from notebook_prefs (graceful — column may be named differently)
  let preferredTopics: string[] = ["daily", "feelings", "food"];
  try {
    const { data: prefs } = await supabase
      .from("notebook_prefs")
      .select("preferred_topics")
      .eq("user_id", heoId)
      .maybeSingle();

    if (prefs?.preferred_topics && Array.isArray(prefs.preferred_topics)) {
      preferredTopics = prefs.preferred_topics;
    }
  } catch {
    // column might not exist — fall back to defaults
  }

  // 6. Difficult cards (cards Heo marked "khó quá") — stored in generation_meta
  //    We look for pages that have difficult_cards recorded in their metadata.
  const { data: recentDifficult } = await supabase
    .from("daily_pages")
    .select("title_vi, generation_meta")
    .eq("for_user", heoId)
    .not("generation_meta->difficult_cards", "is", null)
    .order("scheduled_for", { ascending: false })
    .limit(5);

  const difficultCardHistory = (recentDifficult ?? []).flatMap((p) => {
    const meta = p.generation_meta as Record<string, unknown> | null;
    return Array.isArray(meta?.difficult_cards) ? (meta.difficult_cards as string[]) : [];
  });

  // 7. Check for pending Masuri hint (set by /api/notebook/admin/regenerate)
  const { data: pendingHint } = await supabase
    .from("daily_pages")
    .select("id, scheduled_for, generation_meta")
    .eq("for_user", heoId)
    .eq("status", "draft")
    .not("generation_meta->masuri_hint", "is", null)
    .maybeSingle();

  const masuriHint = pendingHint
    ? (pendingHint.generation_meta as Record<string, unknown>)?.masuri_hint as string | null
    : null;

  // Tomorrow's date in VN timezone (UTC+7)
  const tomorrowVN = new Date(Date.now() + 7 * 3_600_000 + 86_400_000)
    .toISOString()
    .slice(0, 10);

  // Output
  const state = {
    heo_id: heoId,
    tomorrow: tomorrowVN,
    last_pages: lastPages ?? [],
    recent_vocab: (recentVocab ?? []).map((w) => ({
      word_en: w.word_en,
      word_vi: w.word_vi,
      pos: w.pos,
      topic: w.source_page_topic,
      confidence: w.self_confidence,
    })),
    low_confidence_vocab: lowConfidenceVocab.map((w) => ({
      word_en: w.word_en,
      word_vi: w.word_vi,
    })),
    preferred_topics: preferredTopics,
    difficult_card_history: difficultCardHistory,
    ...(masuriHint ? { "[MASURI_HINT]": masuriHint } : {}),
  };

  console.log(JSON.stringify(state, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
