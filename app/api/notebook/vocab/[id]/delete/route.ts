/**
 * POST /api/notebook/vocab/[id]/delete
 * Removes a word from Heo's vocabulary book.
 * (Hard delete — the vocabulary schema has no deleted_at column.)
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

    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { error } = await supabase
      .from("vocabulary")
      .delete()
      .eq("id", id)
      .eq("user_id", heo.id); // safety: only delete own words

    if (error) {
      console.error("[vocab delete]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[vocab delete]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
