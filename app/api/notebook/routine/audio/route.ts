/**
 * /api/notebook/routine/audio
 * Catch-up for lesson audio pre-generation (see prepareLessonAudio in lib/tts.ts).
 * New lessons are voiced automatically when they arrive; this covers lessons
 * from before that existed, and any whose voicing failed part-way.
 * Secured by CRON_SECRET.
 *
 * GET               → { ready, missing } — non-archived lessons with/without audio
 * POST ?limit=<1-5> → voices the oldest lessons still missing audio, one at a
 *                     time, and returns per-lesson stats plus what remains.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { prepareLessonAudio, ttsConfigured } from "@/lib/tts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  return Boolean(process.env.CRON_SECRET) && secret === process.env.CRON_SECRET;
}

async function counts(supabase: ReturnType<typeof createServerClient>) {
  const base = () =>
    supabase.from("daily_pages").select("id", { count: "exact", head: true }).neq("status", "archived");
  const [missing, all] = await Promise.all([
    base().filter("generation_meta->>audio_ready_at", "is", null),
    base(),
  ]);
  return { missing: missing.count ?? 0, ready: (all.count ?? 0) - (missing.count ?? 0) };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ tts_configured: ttsConfigured(), ...(await counts(createServerClient())) });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ttsConfigured()) return NextResponse.json({ error: "TTS not configured" }, { status: 503 });

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "2") || 2, 1), 5);
  const supabase = createServerClient();
  const { data: pages, error } = await supabase
    .from("daily_pages")
    .select("id, scheduled_for, title_vi")
    .neq("status", "archived")
    .filter("generation_meta->>audio_ready_at", "is", null)
    .order("scheduled_for", { ascending: true })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const p of pages ?? []) {
    results.push({ id: p.id, scheduled_for: p.scheduled_for, title_vi: p.title_vi, stats: await prepareLessonAudio(p.id) });
  }
  return NextResponse.json({ results, ...(await counts(supabase)) });
}
