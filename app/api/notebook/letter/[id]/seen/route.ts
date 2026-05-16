/**
 * POST /api/notebook/letter/[id]/seen
 * Marks a letter as seen by Heo.
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

    await supabase
      .from("letters")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", id)
      .is("seen_at", null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[letter seen]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
