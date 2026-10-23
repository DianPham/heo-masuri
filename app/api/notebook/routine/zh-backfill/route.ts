/**
 * /api/notebook/routine/zh-backfill
 * Adds the Chinese track to lessons created before it existed.
 * Driven by the Claude Code Routine (scripts/routine/ZH_BACKFILL_PROMPT.md).
 * Secured by CRON_SECRET.
 *
 * GET  ?limit=<n, default 3, max 100>
 *   The oldest non-archived lessons still missing a Chinese track (oldest first,
 *   so the Chinese course builds up from the simplest lessons), with their
 *   English track to adapt, plus `course_words` — hanzi already taught as new
 *   words in existing Chinese tracks.
 *
 * POST { page_id, title_zh, cards_zh, overwrite? }
 *   Validates and saves one lesson's Chinese track. Refuses to replace an
 *   existing track unless overwrite=true.
 */
import { NextRequest, NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { validateZhCards } from "@/lib/notebook/validate-lesson";
import { prepareLessonAudio } from "@/lib/tts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  return Boolean(process.env.CRON_SECRET) && secret === process.env.CRON_SECRET;
}

async function heoId(supabase: ReturnType<typeof createServerClient>): Promise<string | null> {
  const { data } = await supabase.from("users").select("id").eq("slug", "heo").single();
  return (data?.id as string | undefined) ?? null;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get("limit") ?? "3") || 3, 1), 100);
  const supabase = createServerClient();
  const heo = await heoId(supabase);
  if (!heo) return NextResponse.json({ error: "Heo not found" }, { status: 500 });

  const [missingRes, doneRes] = await Promise.all([
    supabase
      .from("daily_pages")
      .select("id, scheduled_for, status, title_vi, title_en, topic, difficulty, cards", { count: "exact" })
      .eq("for_user", heo)
      .neq("status", "archived")
      .is("cards_zh", null)
      .order("scheduled_for", { ascending: true })
      .limit(limit),
    supabase
      .from("daily_pages")
      .select("cards_zh")
      .eq("for_user", heo)
      .neq("status", "archived")
      .not("cards_zh", "is", null),
  ]);

  if (missingRes.error) {
    console.error("[zh-backfill GET]", missingRes.error);
    return NextResponse.json({ error: missingRes.error.message }, { status: 500 });
  }

  const courseWords = new Set<string>();
  for (const row of doneRes.data ?? []) {
    for (const card of (row.cards_zh as Array<Record<string, unknown>>) ?? []) {
      if (card?.type === "word" && typeof card.word_zh === "string") courseWords.add(card.word_zh);
    }
  }

  return NextResponse.json({
    remaining: missingRes.count ?? 0,
    done: doneRes.data?.length ?? 0,
    course_words: [...courseWords],
    pages: missingRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { page_id, title_zh, cards_zh, overwrite } = body as {
    page_id?: string;
    title_zh?: unknown;
    cards_zh?: unknown;
    overwrite?: boolean;
  };

  const errors: string[] = [];
  if (!page_id) errors.push("page_id required");
  if (typeof title_zh !== "string" || !/\p{Script=Han}/u.test(title_zh)) errors.push("title_zh must be a Chinese title");
  errors.push(...validateZhCards(cards_zh));
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const supabase = createServerClient();
  const heo = await heoId(supabase);
  if (!heo) return NextResponse.json({ error: "Heo not found" }, { status: 500 });

  const { data: page } = await supabase
    .from("daily_pages")
    .select("id, status, cards_zh, generation_meta")
    .eq("id", page_id)
    .eq("for_user", heo)
    .maybeSingle();

  if (!page || page.status === "archived") {
    return NextResponse.json({ error: "Page not found (or archived)" }, { status: 404 });
  }
  if (page.cards_zh && !overwrite) {
    return NextResponse.json(
      { error: "Page already has a Chinese track — pass overwrite=true to replace it.", already_done: true },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("daily_pages")
    .update({
      title_zh: (title_zh as string).trim(),
      cards_zh,
      generation_meta: {
        ...((page.generation_meta as Record<string, unknown> | null) ?? {}),
        zh_generated_at: new Date().toISOString(),
        zh_generated_by: "backfill",
      },
    })
    .eq("id", page.id);

  if (error) {
    console.error("[zh-backfill POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Voice the new Chinese track (and any English clips still missing)
  after(() => prepareLessonAudio(page.id));

  revalidatePath("/heo/notebook");
  revalidatePath("/heo/notebook/scrapbook");
  revalidatePath("/heo/notebook/today");
  return NextResponse.json({ ok: true, page_id: page.id });
}
