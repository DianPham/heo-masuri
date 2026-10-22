/**
 * /api/notebook/vocab
 *
 * GET  ?limit=<n>&since=<date>
 *   Returns Heo's saved vocabulary words, newest first.
 *   Joins with daily_pages for source page title + topic.
 *   Returns [] gracefully if table doesn't exist yet.
 *
 * POST { word_en, word_vi, example_en?, example_vi?, pos?, source_page_id?, source_kind? }
 *   Upserts a vocabulary word (dedupes on lower(word_en) per user).
 *   Returns { id }.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE = { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" };

const SOURCE_KINDS = ["page", "masuri_card", "ask_masuri", "letter"] as const;

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ words: [] });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200"), 500);
    const since = url.searchParams.get("since");

    let query = supabase
      .from("vocabulary")
      .select(
        `id, word_en, word_vi, example_en, example_vi, pos,
         source_page_id, source_kind, saved_at,
         last_reviewed_at, review_count, self_confidence,
         source_page:daily_pages(title_vi, topic)`
      )
      .eq("user_id", heo.id)
      .order("saved_at", { ascending: false })
      .limit(limit);

    if (since) query = query.gte("saved_at", since);

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ words: [] }); // table not yet created
      console.error("[vocab GET]", error);
      return NextResponse.json({ words: [] });
    }

    // Flatten the joined source_page fields
    const words = (data ?? []).map((row) => {
      const sp = Array.isArray(row.source_page)
        ? (row.source_page[0] as { title_vi: string; topic: string } | undefined)
        : (row.source_page as { title_vi: string; topic: string } | null);
      return {
        id: row.id,
        word_en: row.word_en,
        word_vi: row.word_vi,
        example_en: row.example_en,
        example_vi: row.example_vi,
        pos: row.pos,
        source_page_id: row.source_page_id,
        source_kind: row.source_kind,
        saved_at: row.saved_at,
        last_reviewed_at: row.last_reviewed_at,
        review_count: row.review_count,
        self_confidence: row.self_confidence,
        source_page_title_vi: sp?.title_vi,
        source_page_topic: sp?.topic,
      };
    });

    return NextResponse.json({ words }, { headers: PRIVATE_CACHE });
  } catch (err) {
    console.error("[vocab GET]", err);
    return NextResponse.json({ words: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServerClient();
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { word_en, word_vi, example_en, example_vi, pos } = body;
    const source_kind: string = SOURCE_KINDS.includes(body.source_kind)
      ? body.source_kind
      : "page";

    // Only pass source_page_id if it looks like a real UUID (test pages use slugs)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const source_page_id = UUID_RE.test(body.source_page_id ?? "") ? body.source_page_id : null;

    if (!word_en || !word_vi) {
      return NextResponse.json({ error: "word_en and word_vi required" }, { status: 400 });
    }

    // Upsert on (user_id, lower(word_en)) — unique index in DB
    const { data, error } = await supabase
      .from("vocabulary")
      .upsert(
        {
          user_id: heo.id,
          word_en: word_en.trim(),
          word_vi: word_vi.trim(),
          example_en: example_en?.trim() ?? null,
          example_vi: example_vi?.trim() ?? null,
          pos: pos ?? null,
          source_page_id: source_page_id ?? null,
          source_kind,
          saved_at: new Date().toISOString(),
        },
        { onConflict: "user_id,word_en" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[vocab POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[vocab POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
