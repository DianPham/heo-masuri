/**
 * POST /api/notebook/ask/[id]/thank
 * Heo thanks Masuri for an ask reply — fires a hug ping (Phase 1 pipeline, G4).
 * Also marks the thread as seen (if not already).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushIfAllowed } from "@/lib/push";
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

    const { data: heo } = await supabase
      .from("users")
      .select("id, display_name")
      .eq("slug", "heo")
      .single();
    const { data: masuri } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "masuri")
      .single();

    if (!heo || !masuri) {
      return NextResponse.json({ error: "Users not found" }, { status: 500 });
    }

    // Mark seen (belt-and-suspenders — the client may have already called /seen)
    await supabase
      .from("ask_masuri_threads")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", id)
      .eq("from_user", heo.id)
      .is("seen_at", null);

    // G4: fire hug via Phase 1 thinking_pings pipeline
    const { data: row } = await supabase
      .from("thinking_pings")
      .insert({ from_user: heo.id, to_user: masuri.id, kind: "hug" })
      .select("id")
      .single();

    if (row) {
      await supabase.channel("couple").send({
        type: "broadcast",
        event: "thinking:new",
        payload: { id: row.id, kind: "hug", from: "heo", from_name: heo.display_name },
      });
    }

    sendPushIfAllowed(masuri.id, "hug_kiss_enabled", {
      title: "Heo cảm ơn Masuri 💕",
      body: `${heo.display_name} gửi cho bạn một cái ôm 🤗`,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/masuri/notebook`,
      tag: "ask-thank",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ask thank]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
