import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (!who) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServerClient();
  const { data: user } = await supabase.from("users").select("id").eq("slug", who).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}

export async function PUT(req: NextRequest) {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (!who) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServerClient();
  const { data: user } = await supabase.from("users").select("id").eq("slug", who).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const allowed = [
    "missing_enabled", "thinking_enabled", "hug_kiss_enabled",
    "angry_enabled", "quiet_start", "quiet_end",
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });
  return NextResponse.json(data);
}
