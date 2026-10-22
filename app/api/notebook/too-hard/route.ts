/**
 * POST /api/notebook/too-hard
 *
 * Fired when Heo taps "Khó quá 😣" on an exercise card.
 * Sends a push notification to Masuri (rate-limited: max 1 per page per day server-side).
 * Rate-limit key: one push per page_id per VN calendar day.
 *
 * Body: { page_id: string, card_index: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// In-memory rate limiter (per Vercel function instance; good enough for a 2-person app).
// Key: `${page_id}:${vnDate}` — value: timestamp of last ping.
const PINGED: Map<string, number> = new Map();

function vnDateString(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const page_id: string = body.page_id ?? "";

    if (!page_id) {
      return NextResponse.json({ error: "page_id required" }, { status: 400 });
    }

    // Rate-limit: 1 ping per page per VN day
    const rateKey = `${page_id}:${vnDateString()}`;
    if (PINGED.has(rateKey)) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    PINGED.set(rateKey, Date.now());

    // Evict old keys (keep map small)
    const today = vnDateString();
    for (const k of PINGED.keys()) {
      if (!k.endsWith(today)) PINGED.delete(k);
    }

    const supabase = createServerClient();
    const { data: masuri } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "masuri")
      .single();

    if (!masuri) return NextResponse.json({ ok: true });

    await sendPushToUser(masuri.id, {
      title: "Heo đang thấy khó 😣",
      body: "Một thẻ trong trang hôm nay hơi khó — Heo vẫn tiếp tục nha 💕",
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/masuri/notebook`,
      tag: "too-hard",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[too-hard POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
