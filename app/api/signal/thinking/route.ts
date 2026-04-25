import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushIfAllowed } from "@/lib/push";
import { cookies } from "next/headers";

const KINDS = ["thinking", "hug", "kiss"] as const;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value as "heo" | "masuri" | undefined;
  if (!who) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const supabase = createServerClient();
  const recipientSlug = who === "heo" ? "masuri" : "heo";

  const { data: sender } = await supabase.from("users").select("id, display_name").eq("slug", who).single();
  const { data: recipient } = await supabase.from("users").select("id").eq("slug", recipientSlug).single();
  if (!sender || !recipient) return NextResponse.json({ error: "Users not found" }, { status: 500 });

  const { data: row, error } = await supabase
    .from("thinking_pings")
    .insert({ from_user: sender.id, to_user: recipient.id, kind })
    .select("id")
    .single();

  if (error || !row) return NextResponse.json({ error: "DB error" }, { status: 500 });

  // Realtime
  await supabase.channel("couple").send({
    type: "broadcast",
    event: "thinking:new",
    payload: { id: row.id, kind, from: who, from_name: sender.display_name },
  });

  // Push
  const pushMessages: Record<string, string> = {
    thinking: `${sender.display_name} đang nhớ tới bạn 💕`,
    hug:      `${sender.display_name} gửi cho bạn một cái ôm 🤗`,
    kiss:     `${sender.display_name} gửi cho bạn một nụ hôn 💋`,
  };
  sendPushIfAllowed(recipient.id, "hug_kiss_enabled", {
    title: "Heo & Masuri 💕",
    body: pushMessages[kind],
    url: `${process.env.NEXT_PUBLIC_APP_URL}/${recipientSlug}`,
    tag: "thinking",
  });

  return NextResponse.json({ id: row.id });
}
