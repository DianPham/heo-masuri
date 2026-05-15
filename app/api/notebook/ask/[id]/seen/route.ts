/**
 * POST /api/notebook/ask/[id]/seen
 * Heo marks Masuri's reply as seen.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { error } = await supabase
      .from("ask_masuri_threads")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", id)
      .eq("from_user", heo.id)
      .is("seen_at", null);

    if (error) {
      console.error("[ask seen]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ask seen]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
