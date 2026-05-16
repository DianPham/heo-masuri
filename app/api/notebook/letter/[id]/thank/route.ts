/**
 * POST /api/notebook/letter/[id]/thank
 * Heo thanks Masuri for her reply — sends a push notification to Masuri.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    const { data: masuri } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "masuri")
      .single();

    if (!masuri) return NextResponse.json({ error: "User not found" }, { status: 500 });

    sendPushToUser(masuri.id, {
      title: "Heo cảm ơn Masuri 💕",
      body: "Heo đã đọc thư và gửi lời cảm ơn đến Masuri 🌸",
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/masuri/notebook/letter/${id}`,
      tag: "letter-thank",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[letter thank]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
