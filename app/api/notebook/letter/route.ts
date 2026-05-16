/**
 * GET  /api/notebook/letter?limit=<n>&kind=<kind>
 *   Returns letters for Heo — both received (from Masuri) and sent (Heo's weekly letters).
 *   Newest delivered first.
 *
 * POST /api/notebook/letter
 *   Heo sends a weekly letter (or two-truths variant) to Masuri.
 *   Body: { kind, body, prompt_id?, language?, attachments? }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const PRIVATE_CACHE = { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" };

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return NextResponse.json({ letters: [] });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
    const kind = url.searchParams.get("kind");

    // Letters to Heo (from Masuri) + Heo's own sent letters
    let query = supabase
      .from("letters")
      .select("id, from_user, to_user, kind, prompt_id, body, language, attachments, in_reply_to, delivered_at, seen_at, created_at")
      .or(`to_user.eq.${heo.id},from_user.eq.${heo.id}`)
      .lte("delivered_at", new Date().toISOString())
      .order("delivered_at", { ascending: false })
      .limit(limit);

    if (kind) query = query.eq("kind", kind);

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ letters: [] });
      console.error("[letter GET]", error);
      return NextResponse.json({ letters: [] });
    }

    return NextResponse.json({ letters: data ?? [] }, { headers: PRIVATE_CACHE });
  } catch (err) {
    console.error("[letter GET]", err);
    return NextResponse.json({ letters: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServerClient();

    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    const { data: masuri } = await supabase.from("users").select("id").eq("slug", "masuri").single();
    if (!heo || !masuri) return NextResponse.json({ error: "Users not found" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const kind: string = ["weekly_letter", "two_truths"].includes(body.kind)
      ? body.kind
      : "weekly_letter";
    const letterBody: string = (body.body ?? "").trim();
    const prompt_id: string | null = body.prompt_id ?? null;
    const language: string = ["vi", "en", "mixed"].includes(body.language)
      ? body.language
      : "en";
    const attachments = body.attachments ?? null;

    if (!letterBody) {
      return NextResponse.json({ error: "body required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("letters")
      .insert({
        from_user: heo.id,
        to_user: masuri.id,
        kind,
        prompt_id,
        body: letterBody,
        language,
        attachments,
        scheduled_for: now,
        delivered_at: now,
        created_at: now,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[letter POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Bust caches so inbox + home nudge card update immediately
    revalidatePath("/heo/notebook/letter");
    revalidatePath("/heo/notebook");

    // Push to Masuri
    const title = kind === "two_truths"
      ? "Heo chơi Two Truths với Masuri 🎭"
      : "Heo viết thư rồi 📨";
    const preview = letterBody.slice(0, 80) + (letterBody.length > 80 ? "…" : "");
    sendPushToUser(masuri.id, {
      title,
      body: preview,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/masuri/notebook/letter/${data.id}`,
      tag: "letter",
    });

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[letter POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
