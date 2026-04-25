import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (!who) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== "XÓA HẾT" && confirm !== "DELETE-EVERYTHING") {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Truncate all tables except users and notification_prefs
  const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";
  await Promise.all([
    supabase.from("missing_signals").delete().neq("id", PLACEHOLDER_UUID),
    supabase.from("thinking_pings").delete().neq("id", PLACEHOLDER_UUID),
    supabase.from("angry_buzzes").delete().neq("id", PLACEHOLDER_UUID),
    supabase.from("reunion_dates").delete().neq("id", PLACEHOLDER_UUID),
    supabase.from("push_subscriptions").delete().neq("id", PLACEHOLDER_UUID),
  ]);

  return NextResponse.json({ ok: true });
}
