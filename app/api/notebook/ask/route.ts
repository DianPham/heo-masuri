/**
 * /api/notebook/ask
 *
 * POST { word_en?, question_text, source_page_id? }
 *   Heo creates a new question for Masuri. Pushes to Masuri.
 *
 * GET ?limit=<n>&filter=<all|pending|answered>
 *   List ask threads. Returns Heo's threads if `who=heo`; Masuri sees all of Heo's.
 *   Default: newest first.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Only Heo can ask" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const question_text: string = (body.question_text ?? "").trim();
    const word_en: string | null = body.word_en?.trim() || null;

    if (!question_text && !word_en) {
      return NextResponse.json(
        { error: "question_text or word_en required" },
        { status: 400 }
      );
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

    const source_page_id = UUID_RE.test(body.source_page_id ?? "")
      ? body.source_page_id
      : null;

    const { data, error } = await supabase
      .from("ask_masuri_threads")
      .insert({
        from_user: heo.id,
        context_word: word_en,
        question_note: question_text || `Giải thích từ "${word_en}" giúp Heo nha 💕`,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ask POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Push to Masuri
    const preview = word_en
      ? `Heo hỏi về từ "${word_en}"`
      : question_text.length > 60
      ? question_text.slice(0, 60) + "…"
      : question_text;
    sendPushToUser(masuri.id, {
      title: "Heo có câu hỏi 💬",
      body: preview,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/masuri/notebook/ask/${data.id}`,
      tag: "ask",
    });

    // Realtime broadcast
    await supabase.channel("couple").send({
      type: "broadcast",
      event: "ask:new",
      payload: { id: data.id, word_en, preview },
    });

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[ask POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const who = cookieStore.get("who")?.value;
    if (who !== "heo" && who !== "masuri") {
      return NextResponse.json({ threads: [] });
    }

    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return NextResponse.json({ threads: [] });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
    const filter = url.searchParams.get("filter") ?? "all";

    let query = supabase
      .from("ask_masuri_threads")
      .select("id, context_word, question_note, reply_text, replied_at, seen_at, created_at")
      .eq("from_user", heo.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filter === "pending") query = query.is("reply_text", null);
    else if (filter === "answered") query = query.not("reply_text", "is", null);
    // (filter === "all" needs no extra clause)

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ threads: [] });
      console.error("[ask GET]", error);
      return NextResponse.json({ threads: [] });
    }

    return NextResponse.json({ threads: data ?? [] });
  } catch (err) {
    console.error("[ask GET]", err);
    return NextResponse.json({ threads: [] });
  }
}
