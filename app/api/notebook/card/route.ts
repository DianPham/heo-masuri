/**
 * POST /api/notebook/card
 * Masuri hand-writes a vocabulary card for Heo.
 * Creates both a letters row (kind='vocab_card') and a vocabulary row.
 * Body: { word_en, word_vi, example_en, personal_note? }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "masuri") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServerClient();
    const { data: masuri } = await supabase.from("users").select("id").eq("slug", "masuri").single();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!masuri || !heo) return NextResponse.json({ error: "Users not found" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const word_en: string = (body.word_en ?? "").trim();
    const word_vi: string = (body.word_vi ?? "").trim();
    const example_en: string = (body.example_en ?? "").trim();
    const personal_note: string = (body.personal_note ?? "").trim();

    if (!word_en || !word_vi) {
      return NextResponse.json({ error: "word_en và word_vi là bắt buộc" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Build letter body from card content
    const letterBody = [
      `📖 ${word_en} — ${word_vi}`,
      example_en ? `"${example_en}"` : null,
      personal_note ? `\n${personal_note}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Insert letters row (kind='vocab_card')
    const { data: letter, error: letterErr } = await supabase
      .from("letters")
      .insert({
        from_user: masuri.id,
        to_user: heo.id,
        kind: "vocab_card",
        body: letterBody,
        language: "en",
        attachments: { word_en, word_vi, example_en: example_en || null, personal_note: personal_note || null },
        scheduled_for: now,
        delivered_at: now,
        created_at: now,
      })
      .select("id")
      .single();

    if (letterErr) {
      console.error("[card POST letter]", letterErr);
      return NextResponse.json({ error: letterErr.message }, { status: 500 });
    }

    // Insert vocabulary row for Heo (source_kind='masuri_card')
    const { error: vocabErr } = await supabase
      .from("vocabulary")
      .upsert(
        {
          user_id: heo.id,
          word_en,
          word_vi,
          example_en: example_en || null,
          pos: null,
          source_kind: "masuri_card",
          saved_at: now,
        },
        { onConflict: "user_id,word_en" }
      );

    if (vocabErr) {
      // Non-fatal — letter already created
      console.error("[card POST vocab]", vocabErr);
    }

    // Push to Heo
    sendPushToUser(heo.id, {
      title: "Masuri viết thiệp từ vựng cho Heo 💕",
      body: `${word_en} — ${word_vi}`,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/heo/notebook/letter/${letter.id}`,
      tag: "vocab-card",
    });

    revalidatePath("/heo/notebook/letter");
    revalidatePath("/heo/notebook/vocab");

    return NextResponse.json({ id: letter.id });
  } catch (err) {
    console.error("[card POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
