import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { notifyAngry } from "@/lib/discord";
import { sendPushIfAllowed } from "@/lib/push";
import { cookies } from "next/headers";

const NEED_TYPES = ["space", "presence", "vent", "fix"] as const;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("who")?.value !== "heo") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const needType = body.need_type;
  if (!NEED_TYPES.includes(needType)) {
    return NextResponse.json({ error: "Invalid need_type" }, { status: 400 });
  }
  const contextNote: string | undefined = body.context_note ?? undefined;

  const supabase = createServerClient();
  const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
  const { data: masuri } = await supabase.from("users").select("id").eq("slug", "masuri").single();
  if (!heo || !masuri) return NextResponse.json({ error: "Users not found" }, { status: 500 });

  const { data: row, error } = await supabase
    .from("angry_buzzes")
    .insert({ from_user: heo.id, need_type: needType, context_note: contextNote ?? null })
    .select("id")
    .single();

  if (error || !row) return NextResponse.json({ error: "DB error" }, { status: 500 });

  // Discord
  notifyAngry({ id: row.id, needType, contextNote });

  // Realtime
  await supabase.channel("couple").send({
    type: "broadcast",
    event: "angry:new",
    payload: { id: row.id, need_type: needType },
  });

  // Push to Dân
  sendPushIfAllowed(masuri.id, "angry_enabled", {
    title: "💔 Heo đang không ổn",
    body: "Nhấn để xem và trả lời",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/masuri`,
    tag: "angry",
  });

  return NextResponse.json({ id: row.id });
}
