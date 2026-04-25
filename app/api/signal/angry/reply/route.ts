import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushIfAllowed } from "@/lib/push";
import { cookies } from "next/headers";

const VALID_REPLIES = ["sorry", "on_my_way", "talk_in_10", "heard_you"] as const;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("who")?.value !== "masuri") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, reply } = await req.json().catch(() => ({}));
  if (!id || !VALID_REPLIES.includes(reply)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("angry_buzzes")
    .update({ dan_reply: reply, dan_replied_at: new Date().toISOString() })
    .eq("id", id)
    .is("dan_reply", null);

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  await supabase.channel("couple").send({
    type: "broadcast",
    event: "angry:reply",
    payload: { id, reply },
  });

  const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
  const REPLY_LABELS: Record<string, string> = {
    sorry:      "Xin lỗi em 🙏",
    on_my_way:  "Anh đang đến 🏃",
    talk_in_10: "10 phút nữa mình nói chuyện nhé 💬",
    heard_you:  "Anh nghe em rồi 💕",
  };
  if (heo) {
    sendPushIfAllowed(heo.id, "angry_enabled", {
      title: "Masuri đã trả lời 💕",
      body: REPLY_LABELS[reply] ?? reply,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/heo`,
      tag: "angry-reply",
    });
  }

  return NextResponse.json({ ok: true });
}
