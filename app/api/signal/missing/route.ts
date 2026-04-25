import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { notifyMissing } from "@/lib/discord";
import { sendPushIfAllowed } from "@/lib/push";
import { startOfDayVN, endOfDayVN } from "@/lib/tz";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const intensity = Number(body.intensity);
  if (![1, 2, 3].includes(intensity)) {
    return NextResponse.json({ error: "Invalid intensity" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (who !== "heo") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient();

  // Resolve from_user
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "heo")
    .single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 500 });

  // Count today's missings (UTC+7)
  const start = startOfDayVN().toISOString();
  const end = endOfDayVN().toISOString();
  const { count } = await supabase
    .from("missing_signals")
    .select("id", { count: "exact", head: true })
    .eq("from_user", user.id)
    .gte("created_at", start)
    .lte("created_at", end);

  const countToday = (count ?? 0) + 1;

  // Insert
  const { data: row, error } = await supabase
    .from("missing_signals")
    .insert({ from_user: user.id, intensity })
    .select("id")
    .single();
  if (error || !row) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Discord webhook (fire-and-forget, non-blocking)
  notifyMissing({ id: row.id, intensity: intensity as 1 | 2 | 3, countToday });

  // Realtime broadcast to Dân's open session
  await supabase.channel("couple").send({
    type: "broadcast",
    event: "missing:new",
    payload: { id: row.id, intensity, count_today: countToday },
  });

  // Web Push to Dân
  const { data: masuri } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "masuri")
    .single();
  if (masuri) {
    sendPushIfAllowed(masuri.id, "missing_enabled", {
      title: intensity === 3 ? "💔 Heo nhớ Masuri lắm lắm" : "🐷 Heo nhớ Masuri",
      body: `Lần thứ ${countToday} hôm nay`,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/masuri`,
      tag: "missing",
    });
  }

  return NextResponse.json({ id: row.id, count_today: countToday });
}
