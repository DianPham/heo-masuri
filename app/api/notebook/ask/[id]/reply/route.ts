/**
 * POST /api/notebook/ask/[id]/reply
 * Body: { reply_text: string }
 * Masuri replies to a question. Pushes to Heo.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "masuri") {
      return NextResponse.json({ error: "Only Masuri can reply" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reply_text: string = (body.reply_text ?? "").trim();
    if (!reply_text) {
      return NextResponse.json({ error: "reply_text required" }, { status: 400 });
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

    const { data: thread, error: fetchErr } = await supabase
      .from("ask_masuri_threads")
      .select("id, word_en, question_text")
      .eq("id", id)
      .single();

    if (fetchErr || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("ask_masuri_threads")
      .update({ reply_text, replied_at: new Date().toISOString(), seen_at: null })
      .eq("id", id);

    if (error) {
      console.error("[ask reply]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Push to Heo
    const preview =
      reply_text.length > 60 ? reply_text.slice(0, 60) + "…" : reply_text;
    sendPushToUser(heo.id, {
      title: `${masuri.display_name} đã trả lời 💕`,
      body: thread.word_en ? `Về từ "${thread.word_en}": ${preview}` : preview,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/heo/notebook/ask`,
      tag: "ask-reply",
    });

    await supabase.channel("couple").send({
      type: "broadcast",
      event: "ask:reply",
      payload: { id, preview },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ask reply]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
