/**
 * /api/surprises/pool/[id]
 *
 * PATCH → update a single pool item (body, language, weight) or retire it.
 *
 * Body:
 *   { body?, language?, weight?, attachments?, retire?: boolean }
 *
 * To un-retire, pass `retire: false`.
 *
 * Auth: cookie `who=masuri`.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createTypedServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

export const dynamic = "force-dynamic";

async function requireMasuri() {
  const cookieStore = await cookies();
  return cookieStore.get("who")?.value === "masuri";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireMasuri())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: TablesUpdate<"surprise_pool"> = {};

  if (typeof body.body === "string") {
    const trimmed = body.body.trim();
    if (!trimmed) return NextResponse.json({ error: "body cannot be empty" }, { status: 400 });
    update.body = trimmed;
  }

  if (typeof body.language === "string") {
    if (!["vi", "en", "mixed"].includes(body.language)) {
      return NextResponse.json({ error: "invalid language" }, { status: 400 });
    }
    update.language = body.language;
  }

  if (typeof body.weight === "number") {
    if (body.weight < 1 || body.weight > 10) {
      return NextResponse.json({ error: "weight must be 1-10" }, { status: 400 });
    }
    update.weight = body.weight;
  }

  if (body.attachments !== undefined) {
    update.attachments = body.attachments;
  }

  if (typeof body.retire === "boolean") {
    update.retired_at = body.retire ? new Date().toISOString() : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const supabase = createTypedServerClient();
  const { error } = await supabase
    .from("surprise_pool")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[surprises/pool PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
