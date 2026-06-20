/**
 * POST /api/dates/scheduled/[id]/spin
 *
 * Server-side spin. Reads outline_snapshot, picks one candidate per slot via
 * the weighted-random algorithm (lib/spin.ts), writes itinerary + flipped_at,
 * and bumps used_count + last_used_at on the picked date_ideas.
 *
 * Body (optional): { mode?: 'all-at-once' | 'slot-by-slot' }   // recorded only
 *
 * Returns { itinerary, date }.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import { pickForSlot, type SlotCandidate } from "@/lib/spin";
import { notifyPartner } from "@/lib/notify";

export const dynamic = "force-dynamic";

type Slot = {
  id?: string;
  type?: string;
  label_vi?: string;
  label_en?: string;
  candidates?: SlotCandidate[];
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("scheduled_dates").select("*").eq("id", id).maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slots = (row.outline_snapshot as Slot[] | null) ?? [];
  if (slots.length === 0) {
    return NextResponse.json({ error: "outline_snapshot empty — nothing to spin" }, { status: 400 });
  }

  type ItineraryPick = {
    slotIndex: number;
    type: string | undefined;
    label_vi: string | undefined;
    pick: SlotCandidate | null;
    manually_overridden: false;
  };

  const itinerary: ItineraryPick[] = slots.map((slot, i) => ({
    slotIndex: i,
    type: slot.type,
    label_vi: slot.label_vi,
    pick: pickForSlot((slot.candidates ?? []) as SlotCandidate[]),
    manually_overridden: false,
  }));

  // Bump used_count + last_used_at on the picked date_ideas.
  const pickedIdeaIds = Array.from(
    new Set(
      itinerary
        .map((it) => it.pick?.date_idea_id)
        .filter((x): x is string => typeof x === "string")
    )
  );
  if (pickedIdeaIds.length > 0) {
    // Read current counts then bulk-update each (no rpc available).
    const { data: ideaRows } = await supabase
      .from("date_ideas").select("id, used_count").in("id", pickedIdeaIds);
    const nowIso = new Date().toISOString();
    for (const r of (ideaRows ?? []) as { id: string; used_count: number }[]) {
      await supabase
        .from("date_ideas")
        .update({ used_count: (r.used_count ?? 0) + 1, last_used_at: nowIso })
        .eq("id", r.id);
    }
  }

  const flippedAt = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from("scheduled_dates")
    .update({ itinerary, flipped_at: flippedAt })
    .eq("id", id)
    .select("*")
    .single();
  if (updErr || !updated) {
    console.error("[scheduled spin update]", updErr);
    return NextResponse.json({ error: "spin failed" }, { status: 500 });
  }

  const planTitle = (updated.title as string | null) ?? "buổi hẹn";
  await notifyPartner({
    actorId: viewerId,
    prefKey: "date_planning_enabled",
    build: (name) => ({
      push: {
        title: `${name} quay xong kế hoạch hẹn 🎲`,
        body: `Mở "${planTitle}" xem kết quả nha 💕`,
        url: `/dates/plan/${id}`,
        tag: "date-plan",
      },
      activity: { icon: "🎲", message: `${name} chốt lịch trình: ${planTitle}`, url: `/dates/plan/${id}` },
    }),
  });

  return NextResponse.json({ itinerary, date: updated });
}
