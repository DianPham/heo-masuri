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
  // Cap: if already MAX_BUFFER days ahead are covered, routine should skip.
  const MAX_BUFFER = 2;

  // Compute tomorrow's date string in VN timezone for the gte filter
  const tomorrowVN = new Date(Date.now() + 7 * 3_600_000 + 86_400_000)
    .toISOString()
    .slice(0, 10);

  // Fetch queued pages including status + generation_meta so we can:
  //   (a) exclude legacy placeholder drafts from date-gap detection
  //   (b) derive the real unpublished count without a second query
  // Old regenerate flow inserted placeholder drafts (generation_meta.placeholder=true)
  // which inflated unpublished_count and caused false early-stops.
  const { data: queuedPages } = await supabase
    .from("daily_pages")
    .select("scheduled_for, status, generation_meta, topic, title_en")
    .eq("for_user", heoId)
    .in("status", ["draft", "approved", "published"])
    .gte("scheduled_for", tomorrowVN)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_BUFFER + 10); // fetch extra to account for filtered-out placeholders

  // Strip legacy placeholder drafts — they were never real lessons
  const realQueued = (queuedPages ?? []).filter((p) => {
    const meta = p.generation_meta as Record<string, unknown> | null;
    return meta?.placeholder !== true;
  });

  // Normalize to plain YYYY-MM-DD strings
  const queuedDates = new Set(
    realQueued.map((p) => String(p.scheduled_for).slice(0, 10))
  );

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
  // next_needed_date = null means MAX_BUFFER days are already covered — routine should skip

  // Count real unpublished (draft/approved) — derived from realQueued, no extra query needed
  const unpublishedCount = realQueued.filter(
    (p) => p.status === "draft" || p.status === "approved"
  ).length;

  // Last 7 published pages + ALL vocab — run in parallel
  const [lastPagesRes, allVocabRes] = await Promise.all([
    supabase
      .from("daily_pages")
      .select("id, title_vi, title_en, topic, difficulty, scheduled_for")
      .eq("for_user", heoId)
      .eq("status", "published")
      .order("scheduled_for", { ascending: false })
      .limit(7),
    supabase
      .from("vocabulary")
      .select("word_en, word_vi, pos, source_page_topic, self_confidence")
      .eq("user_id", heoId)
      .order("saved_at", { ascending: false }),
  ]);
  const lastPages = lastPagesRes.data;
  const allVocab  = allVocabRes.data ?? [];

  // Slice for the "recent context" view (last 30 with full details)
  const recentVocab = allVocab.slice(0, 30);

  // Words she's uncertain about — drawn from ALL saved vocab, not just recent 30
  const lowConfidenceVocab = allVocab
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

  // Look for a Masuri hint for next_needed_date.
  // New style: hint is stored on the archived page's generation_meta (no placeholder draft).
  // Legacy style: hint was stored on a placeholder draft (generation_meta.placeholder=true).
  // We check both so old data keeps working.
  const hintTargetDate = next_needed_date ?? todayVN;

  const [hintArchivedRes, hintDraftRes] = await Promise.all([
    // New: hint on the most recently archived page for this date.
    // Also fetch the full lesson content so the routine can REVISE rather than rebuild.
    supabase
      .from("daily_pages")
      .select("generation_meta, title_vi, title_en, topic, difficulty, cards")
      .eq("for_user", heoId)
      .eq("status", "archived")
      .eq("scheduled_for", hintTargetDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Legacy: hint on a placeholder draft for this date
    supabase
      .from("daily_pages")
      .select("generation_meta")
      .eq("for_user", heoId)
      .eq("status", "draft")
      .eq("scheduled_for", hintTargetDate)
      .maybeSingle(),
  ]);

  const archivedMeta = hintArchivedRes.data?.generation_meta as Record<string, unknown> | null;
  const draftMeta    = hintDraftRes.data?.generation_meta as Record<string, unknown> | null;

  // Prefer archived (new style); fall back to placeholder draft (legacy)
  const masuriHint =
    (archivedMeta?.masuri_hint as string | null) ??
    (draftMeta?.placeholder === true ? (draftMeta?.masuri_hint as string | null) : null);

  // If there's a hint AND the gap is a real regen request, include the archived lesson
  // content so the routine can revise it rather than starting from scratch.
  const archivedLessonForRegen = (masuriHint && next_needed_date && hintArchivedRes.data)
    ? {
        title_vi:   hintArchivedRes.data.title_vi,
        title_en:   hintArchivedRes.data.title_en,
        topic:      hintArchivedRes.data.topic,
        difficulty: hintArchivedRes.data.difficulty,
        cards:      hintArchivedRes.data.cards,
      }
    : null;

  return NextResponse.json({
    heo_id: heoId,
    next_needed_date,          // null = buffer full, routine must stop
    unpublished_count: unpublishedCount,  // real draft/approved future lessons (placeholders excluded)
    queued_dates: [...queuedDates].sort(),  // dates already covered
    // Topics + titles of already-queued (draft/approved) future lessons so the routine
    // can avoid topic duplication with lessons Heo hasn't seen yet.
    queued_page_details: realQueued
      .filter((p) => p.status === "draft" || p.status === "approved")
      .map((p) => ({
        date:     String(p.scheduled_for).slice(0, 10),
        topic:    p.topic    ?? null,
        title_en: p.title_en ?? null,
      })),
    last_pages: lastPages ?? [],
    recent_vocab: recentVocab.map((w) => ({
      word_en:    w.word_en,
      word_vi:    w.word_vi,
      pos:        w.pos,
      topic:      w.source_page_topic,
      confidence: w.self_confidence,
    })),
    // Flat list of EVERY word Heo has ever saved — use this to avoid re-introducing
    // known vocabulary as "new" words. Can freely use these as support/context words.
    all_known_words: allVocab.map((w) => w.word_en),
    low_confidence_vocab: lowConfidenceVocab,
    preferred_topics: preferredTopics,
    ...(masuriHint ? { "[MASURI_HINT]": masuriHint } : {}),
    // Full content of the archived lesson that was flagged for regen.
    // Present only when [MASURI_HINT] exists. Use this as the BASE to revise —
    // keep what's good, apply the hint's changes. Do not rebuild from scratch.
    ...(archivedLessonForRegen ? { "[ARCHIVED_LESSON]": archivedLessonForRegen } : {}),
  });
}
