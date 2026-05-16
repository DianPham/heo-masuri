/**
 * GET  /api/notebook/prefs — fetch notebook prefs for heo (preferred_topics etc.)
 * PUT  /api/notebook/prefs — update notebook prefs
 * Body: { preferred_topics?: string[] }
 *
 * Note: reminder_enabled / reminder_time live on /api/notebook/reminder.
 * This endpoint handles the non-reminder prefs: topics used by the routine generator.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ preferred_topics: [] });
    }

    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return NextResponse.json({ preferred_topics: [] });

    const { data } = await supabase
      .from("notebook_prefs")
      .select("preferred_topics")
      .eq("user_id", heo.id)
      .maybeSingle();

    return NextResponse.json(
      { preferred_topics: data?.preferred_topics ?? [] },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
    );
  } catch (err) {
    console.error("[notebook/prefs GET]", err);
    return NextResponse.json({ preferred_topics: [] });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const preferred_topics: string[] = Array.isArray(body.preferred_topics)
      ? body.preferred_topics.filter((t: unknown) => typeof t === "string")
      : [];

    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { error } = await supabase
      .from("notebook_prefs")
      .upsert(
        {
          user_id: heo.id,
          preferred_topics,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[notebook/prefs PUT]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notebook/prefs PUT]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
