import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("reunion_dates")
    .select("id, label, label_en, target_date, created_at")
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return NextResponse.json(null);

  // Once the reunion date is more than 24h in the past, treat it as expired
  const targetMs = new Date(data.target_date + "T00:00:00+07:00").getTime();
  if (Date.now() > targetMs + 24 * 60 * 60 * 1000) return NextResponse.json(null);

  return NextResponse.json(data);
}

export async function DELETE() {
  const cookieStore = await cookies();
  if (cookieStore.get("who")?.value !== "masuri") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient();
  await supabase.from("reunion_dates").update({ is_current: false }).eq("is_current", true);

  await supabase.channel("couple").send({
    type: "broadcast",
    event: "reunion:updated",
    payload: { target_date: null },
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("who")?.value !== "masuri") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { label, label_en, target_date } = await req.json().catch(() => ({}));
  if (!label || !target_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Mark old ones as not current
  await supabase.from("reunion_dates").update({ is_current: false }).eq("is_current", true);

  const { data, error } = await supabase
    .from("reunion_dates")
    .insert({ label, label_en: label_en ?? null, target_date, is_current: true })
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "DB error" }, { status: 500 });

  await supabase.channel("couple").send({
    type: "broadcast",
    event: "reunion:updated",
    payload: { target_date: data.target_date },
  });

  return NextResponse.json(data);
}
