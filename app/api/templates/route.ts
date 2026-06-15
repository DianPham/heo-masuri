/**
 * GET /api/templates → list non-archived date_outline_templates, sorted.
 * Read-only; both users may consume.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("date_outline_templates")
    .select("*")
    .eq("archived", false)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[templates GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ templates: data ?? [] });
}
