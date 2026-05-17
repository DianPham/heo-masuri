/**
 * GET  /api/notebook/reminder — fetch current prefs for heo
 * POST /api/notebook/reminder — update reminder_enabled + reminder_time
 * Body: { enabled: boolean, time?: string }  time = "HH:MM" in VN local
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ enabled: false, time: null });
    }

    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return NextResponse.json({ enabled: false, time: null });

    const { data } = await supabase
      .from("notebook_prefs")
      .select("reminder_enabled, reminder_time")
      .eq("user_id", heo.id)
      .maybeSingle();

    return NextResponse.json(
      {
        enabled: data?.reminder_enabled ?? true,   // default ON
        time: data?.reminder_time ? data.reminder_time.slice(0, 5) : "20:00",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[reminder GET]", err);
    return NextResponse.json({ enabled: false, time: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const enabled: boolean = Boolean(body.enabled);
    // time is "HH:MM", store as time value
    const time: string | null = body.time ?? null;

    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { error } = await supabase
      .from("notebook_prefs")
      .upsert(
        {
          user_id: heo.id,
          reminder_enabled: enabled,
          reminder_time: enabled && time ? time : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[reminder POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reminder POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
