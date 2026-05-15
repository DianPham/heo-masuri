/**
 * POST /api/notebook/vocab/[id]/rate
 * Body: { self_confidence: -1 | 0 | 1 }
 * Updates self_confidence and bumps review_count + last_reviewed_at.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const confidence = body.self_confidence;

    if (![-1, 0, 1].includes(confidence)) {
      return NextResponse.json({ error: "self_confidence must be -1, 0, or 1" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Increment review_count by reading current first
    const { data: existing } = await supabase
      .from("vocabulary")
      .select("review_count")
      .eq("id", id)
      .eq("user_id", heo.id)
      .single();

    const { error } = await supabase
      .from("vocabulary")
      .update({
        self_confidence: confidence,
        last_reviewed_at: new Date().toISOString(),
        review_count: (existing?.review_count ?? 0) + 1,
      })
      .eq("id", id)
      .eq("user_id", heo.id);

    if (error) {
      console.error("[vocab rate]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[vocab rate]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
