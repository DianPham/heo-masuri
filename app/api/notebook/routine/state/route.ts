/**
 * GET /api/notebook/routine/state
 * Returns Heo's current learning state for the Claude Code Routine.
 * Secured by CRON_SECRET — only called by the Routine runner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: heo } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "heo")
    .single();

  if (!heo) return NextResponse.json({ error: "Heo not found" }, { status: 500 });

  const heoId = heo.id;

  // Today in VN timezone
  const todayVN = new Date(Date.now() + 7 * 3_600_000)
    .toISOString()
    .slice(0, 10);

  // Find next_needed_date: the first future date with no lesson queued.
  // Cap: if already 3+ days ahead are covered, routine should skip.
  const MAX_BUFFER = 3;
  const { data: queuedPages } = await supabase
    .from("daily_pages")
    .select("scheduled_for")
    .eq("for_user", heoId)
    .in("status", ["draft", "approved", "published"])
    .gt("scheduled_for", todayVN)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_BUFFER + 1);

  const queuedDates = new Set((queuedPages ?? []).map((p) => p.scheduled_for));

  // Walk forward from tomorrow until we find a gap, up to MAX_BUFFER days ahead
  let next_needed_date: string | null = null;
  for (let i = 1; i <= MAX_BUFFER; i++) {
    const candidate = new Date(Date.now() + 7 * 3_600_000 + i * 86_400_000)
      .toISOString()
      .slice(0, 10);
    if (!queuedDates.has(candidate)) {
      next_needed_date = candidate;
      break;
    }
  }
  // next_needed_date = null means 3 days are already covered — routine should skip

  // Last 7 published pages
  const { data: lastPages } = await supabase
    .from("daily_pages")
    .select("id, title_vi, title_en, topic, difficulty, scheduled_for")
    .eq("for_user", heoId)
    .eq("status", "published")
    .order("scheduled_for", { ascending: false })
    .limit(7);

  // Recent 30 vocab words
  const { data: recentVocab } = await supabase
    .from("vocabulary")
    .select("word_en, word_vi, pos, source_page_topic, self_confidence")
    .eq("user_id", heoId)
    .order("saved_at", { ascending: false })
    .limit(30);

  const lowConfidenceVocab = (recentVocab ?? [])
    .filter((w) => w.self_confidence < 0)
    .map((w) => ({ word_en: w.word_en, word_vi: w.word_vi }));

  // Preferred topics from notebook_prefs
  let preferredTopics = ["daily", "feelings", "food"];
  try {
    const { data: prefs } = await supabase
      .from("notebook_prefs")
      .select("preferred_topics")
      .eq("user_id", heoId)
      .maybeSingle();
    if (Array.isArray(prefs?.preferred_topics)) {
      preferredTopics = prefs.preferred_topics;
    }
  } catch { /* column may not exist — use defaults */ }

  // Any pending Masuri hint (placeholder draft with masuri_hint in generation_meta)
  // Check against next_needed_date if set, otherwise check nearest queued draft
  const hintTargetDate = next_needed_date ?? todayVN;
  const { data: hintDraft } = await supabase
    .from("daily_pages")
    .select("generation_meta")
    .eq("for_user", heoId)
    .eq("status", "draft")
    .eq("scheduled_for", hintTargetDate)
    .maybeSingle();

  const masuriHint = hintDraft
    ? ((hintDraft.generation_meta as Record<string, unknown>)?.masuri_hint as string | null)
    : null;

  return NextResponse.json({
    heo_id: heoId,
    next_needed_date,          // null = buffer full (3 days covered), routine should skip
    queued_dates: [...queuedDates].sort(),  // dates already covered
    last_pages: lastPages ?? [],
    recent_vocab: (recentVocab ?? []).map((w) => ({
      word_en: w.word_en,
      word_vi: w.word_vi,
      pos: w.pos,
      topic: w.source_page_topic,
      confidence: w.self_confidence,
    })),
    low_confidence_vocab: lowConfidenceVocab,
    preferred_topics: preferredTopics,
    ...(masuriHint ? { "[MASURI_HINT]": masuriHint } : {}),
  });
}
