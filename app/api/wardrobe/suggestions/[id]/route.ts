/**
 * /api/wardrobe/suggestions/[id]
 *
 * PATCH → respond as the target_user. Body:
 *   { status: 'accepted'|'counter'|'declined', counter_item? }
 *
 * Updates responded_at. When accepted, also bumps the wardrobe_item's
 * wear_count + last_worn_at (this is what powers the "wore on" history
 * per blueprint §7.3).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const RESPONSES = ["accepted", "counter", "declined"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status;
  if (!RESPONSES.includes(status)) {
    return NextResponse.json({ error: "status must be accepted/counter/declined" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("outfit_suggestions")
    .select("target_user, wardrobe_item, status")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.target_user !== viewerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, unknown> = {
    status,
    responded_at: new Date().toISOString(),
  };
  if (status === "counter") {
    const counter = typeof body.counter_item === "string" ? body.counter_item : null;
    if (!counter) return NextResponse.json({ error: "counter_item required for counter" }, { status: 400 });
    // Counter item must belong to the viewer (the one countering).
    const { data: ci } = await supabase
      .from("wardrobe_items").select("owner").eq("id", counter).maybeSingle();
    if (!ci || ci.owner !== viewerId) {
      return NextResponse.json({ error: "counter_item must be yours" }, { status: 400 });
    }
    update.counter_item = counter;
  }

  const { data, error } = await supabase
    .from("outfit_suggestions")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    console.error("[suggestions PATCH]", error);
    return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 500 });
  }

  // On accept (or counter-accept), stamp last_worn_at + bump wear_count
  // on the actually-worn item.
  if (status === "accepted" || status === "counter") {
    const wearItem = (status === "counter" ? update.counter_item : existing.wardrobe_item) as string;
    const { data: cur } = await supabase
      .from("wardrobe_items").select("wear_count").eq("id", wearItem).single();
    await supabase
      .from("wardrobe_items")
      .update({
        last_worn_at: new Date().toISOString(),
        wear_count: ((cur?.wear_count as number | undefined) ?? 0) + 1,
      })
      .eq("id", wearItem);
  }

  return NextResponse.json({ suggestion: data });
}
