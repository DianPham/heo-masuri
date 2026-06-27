/**
 * GET /api/notebook/letter/[id]
 * Returns a single letter + its reply (if any).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Letters are intimate — must be signed in as one of the couple to read.
    // Previously this route returned any letter to anyone with the UUID.
    const viewerId = await getViewerUserId();
    if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    // Couple-only: viewer must be sender or recipient. Both users in this app
    // naturally satisfy this for any letter between them, but the check
    // defends against URL/UUID leakage.
    if (letter.from_user !== viewerId && letter.to_user !== viewerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
