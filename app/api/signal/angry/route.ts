import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { notifyAngry } from "@/lib/discord";
import { sendPushIgnoringQuietHours } from "@/lib/push";
import { cookies } from "next/headers";

const NEED_TYPES = ["space", "presence", "vent", "fix"] as const;

const NEED_PUSH_BODY: Record<string, string> = {
  space:    "Heo cần một chút không gian",
  presence: "Heo cần Masuri ở đây",
  vent:     "Heo cần được lắng nghe",
  fix:      "Heo cần Masuri giúp sửa một chuyện",
};

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

  // Enforce single-active-buzz constraint (also enforced at DB level via partial unique index)
  const { data: activeBuzz } = await supabase
    .from("angry_buzzes")
    .select("id")
    .eq("from_user", heo.id)
    .is("resolved_at", null)
    .maybeSingle();

  if (activeBuzz) {
    return NextResponse.json({ active_buzz_id: activeBuzz.id }, { status: 409 });
  }

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

  // Push to Masuri — angry buzzes bypass quiet hours. His partner's distress takes priority.
  const pushBody = contextNote
    ? `${NEED_PUSH_BODY[needType]} — ${contextNote.slice(0, 60)}`
    : (NEED_PUSH_BODY[needType] ?? "Heo đang không ổn");

  sendPushIgnoringQuietHours(masuri.id, "angry_enabled", {
    title: "💔 Heo đang không ổn",
    body: pushBody,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/masuri/angry/${row.id}`,
    tag: "angry",
  });

  return NextResponse.json({ id: row.id });
}
