/**
 * GET /api/notebook/admin/draft
 * Masuri-only. Returns all draft + approved pages, newest first.
 * Used by the approval UI and Masuri's dashboard.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("who")?.value !== "masuri") {
    return NextResponse.json({ error: "Masuri only" }, { status: 403 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("daily_pages")
    .select(
      "id, title_vi, title_en, topic, difficulty, cards, scheduled_for, status, generated_by, generation_meta, approved_at, published_at, completed_at, created_at"
    )
    .in("status", ["draft", "approved"])
    .order("scheduled_for", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[admin/draft GET]", error);
    return NextResponse.json({ pages: [] });
  }

  return NextResponse.json({ pages: data ?? [] });
}
