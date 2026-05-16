/**
 * GET /api/notebook/letter/[id]
 * Returns a single letter + its reply (if any).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: letter, error } = await supabase
      .from("letters")
      .select("id, from_user, to_user, kind, prompt_id, body, language, attachments, in_reply_to, delivered_at, seen_at, created_at")
      .eq("id", id)
      .single();

    if (error || !letter) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch reply (a letter that has in_reply_to = this letter's id)
    const { data: reply } = await supabase
      .from("letters")
      .select("id, from_user, body, language, attachments, delivered_at, created_at")
      .eq("in_reply_to", id)
      .maybeSingle();

    return NextResponse.json({ letter, reply: reply ?? null });
  } catch (err) {
    console.error("[letter/[id] GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
