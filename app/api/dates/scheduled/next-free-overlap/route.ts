/**
 * GET /api/dates/scheduled/next-free-overlap
 *
 * Returns { start_at, end_at } for the earliest 2-hour window in the next 7
 * days where neither user has a calendar_events row. Used by the scheduler
 * sheet to prefill start/end. Blueprint §7.5.
 */
import { NextResponse } from "next/server";
import { getViewerUserId } from "@/lib/calendar";
import { nextFreeOverlap } from "@/lib/next-free-overlap";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const overlap = await nextFreeOverlap();
  return NextResponse.json(overlap);
}
