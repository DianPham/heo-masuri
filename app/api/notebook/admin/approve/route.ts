/**
 * POST /api/notebook/admin/approve
 * Masuri-only. Approves (and optionally edits) a draft page.
 *
 * Body: {
 *   page_id: string,
 *   edits?: {                    // optional — if Masuri edited anything
 *     title_vi?: string,
 *     title_en?: string,
 *     cards?: Card[],
 *   }
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("who")?.value !== "masuri") {
    return NextResponse.json({ error: "Masuri only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { page_id, edits } = body as {
    page_id: string;
    edits?: { title_vi?: string; title_en?: string; cards?: unknown[] };
  };

  if (!page_id) {
    return NextResponse.json({ error: "page_id required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: masuri } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "masuri")
    .single();

  if (!masuri) {
    return NextResponse.json({ error: "Masuri user not found" }, { status: 500 });
  }

  const update: Record<string, unknown> = {
    status: "approved",
    approved_by: masuri.id,
    approved_at: new Date().toISOString(),
  };

  if (edits?.title_vi) update.title_vi = edits.title_vi;
  if (edits?.title_en) update.title_en = edits.title_en;
  if (edits?.cards) update.cards = edits.cards;

  const { error } = await supabase
    .from("daily_pages")
    .update(update)
    .eq("id", page_id)
    .in("status", ["draft", "approved"]); // can re-approve to apply edits

  if (error) {
    console.error("[admin/approve]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/masuri/notebook");
  revalidatePath(`/m/notebook/approve/${page_id}`);
  return NextResponse.json({ ok: true });
}
