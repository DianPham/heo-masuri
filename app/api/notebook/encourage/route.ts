/**
 * POST /api/notebook/encourage
 * Masuri sends an encouragement push to Heo.
 * Body: { message?: string }  — if omitted, a random preset is used.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const PRESETS = [
  "Heo học giỏi lắm! Masuri tự hào lắm nè 💕",
  "Cố lên Heo ơi! Masuri luôn ở đây ủng hộ 🌸",
  "Heo giỏi quá đi! Tiếp tục nha em yêu 🐷✨",
  "Hôm nay Heo học chưa? Masuri đang chờ nè 💌",
  "Mỗi ngày một tí, Heo sẽ giỏi tiếng Anh thôi 🌟",
];

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "masuri") {
      return NextResponse.json({ error: "Only Masuri can send encouragement" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const message: string =
      (body.message ?? "").trim() ||
      PRESETS[Math.floor(Math.random() * PRESETS.length)];

    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    const { data: masuri } = await supabase
      .from("users")
      .select("display_name")
      .eq("slug", "masuri")
      .single();

    if (!heo || !masuri) {
      return NextResponse.json({ error: "Users not found" }, { status: 500 });
    }

    await sendPushToUser(heo.id, {
      title: `${masuri.display_name} gửi động lực 💕`,
      body: message,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/heo/notebook`,
      tag: "encourage",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[encourage]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
