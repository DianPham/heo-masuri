/**
 * POST /api/notebook/letter/[id]/reply
 * Masuri replies to Heo's letter.
 * Body: {
 *   body: string,              — Vietnamese reply text
 *   corrections?: [{            — optional 1-2 gentle corrections
 *     original_en: string,
 *     suggested_en: string,
 *     vi_explanation: string
 *   }],
 *   two_truths_guess?: number  — for two_truths kind: which sentence is the lie (1|2|3)
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "masuri") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    // Verify the original letter exists
    const { data: original, error: fetchErr } = await supabase
      .from("letters")
      .select("id, from_user, to_user, kind")
      .eq("id", id)
      .single();

    if (fetchErr || !original) {
      return NextResponse.json({ error: "Letter not found" }, { status: 404 });
    }

    const { data: masuri } = await supabase.from("users").select("id").eq("slug", "masuri").single();
    if (!masuri) return NextResponse.json({ error: "User not found" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const replyBody: string = (body.body ?? "").trim();
    if (!replyBody) {
      return NextResponse.json({ error: "body required" }, { status: 400 });
    }

    const corrections = Array.isArray(body.corrections) ? body.corrections.slice(0, 2) : null;
    const two_truths_guess = typeof body.two_truths_guess === "number" ? body.two_truths_guess : null;

    const attachments = {
      ...(corrections && corrections.length > 0 ? { corrections } : {}),
      ...(two_truths_guess !== null ? { two_truths_guess } : {}),
    };

    const now = new Date().toISOString();
    const { data: reply, error } = await supabase
      .from("letters")
      .insert({
        from_user: masuri.id,
        to_user: original.from_user,   // reply goes to Heo
        kind: original.kind,
        in_reply_to: id,
        body: replyBody,
        language: "vi",
        attachments: Object.keys(attachments).length > 0 ? attachments : null,
        scheduled_for: now,
        delivered_at: now,
        created_at: now,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[letter reply POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Push to Heo
    sendPushToUser(original.from_user, {
      title: "Masuri đã trả lời thư rồi 💕",
      body: replyBody.slice(0, 80) + (replyBody.length > 80 ? "…" : ""),
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/heo/notebook/letter/${id}`,
      tag: "letter-reply",
    });

    revalidatePath("/heo/notebook/letter");
    revalidatePath(`/heo/notebook/letter/${id}`);

    return NextResponse.json({ id: reply.id });
  } catch (err) {
    console.error("[letter reply POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
