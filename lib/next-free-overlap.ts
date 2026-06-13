/**
 * nextFreeOverlap — find the earliest 2-hour window in the next 7 days where
 * neither user has a calendar event. Used by the date scheduler to prefill
 * start/end. Blueprint §7.5.
 *
 * Strategy: hour-by-hour scan starting at the next top-of-hour in VN time,
 * looking for a 2h run where no calendar_events overlap for either user.
 * Falls back to tomorrow 19:00 VN if nothing free in the window.
 */
import { createServerClient } from "@/lib/supabase/server";

const WINDOW_HOURS = 24 * 7;
const SLOT_HOURS = 2;
const VN_OFFSET_MS = 7 * 3_600_000;

export type FreeOverlap = { start_at: string; end_at: string };

export async function nextFreeOverlap(): Promise<FreeOverlap> {
  const now = Date.now();
  // Round up to next top-of-hour in VN time.
  const nowVn = now + VN_OFFSET_MS;
  const nextHourVn = Math.ceil(nowVn / 3_600_000) * 3_600_000;
  const startMs = nextHourVn - VN_OFFSET_MS;
  const endMs = startMs + WINDOW_HOURS * 3_600_000;

  const supabase = createServerClient();
  const { data } = await supabase
    .from("calendar_events")
    .select("start_at, end_at")
    .lt("start_at", new Date(endMs).toISOString())
    .gt("end_at", new Date(startMs).toISOString());

  type Range = { s: number; e: number };
  const busy: Range[] = (data ?? []).map((r) => ({
    s: new Date(r.start_at as string).getTime(),
    e: new Date(r.end_at as string).getTime(),
  }));

  function isFree(s: number, e: number): boolean {
    for (const b of busy) {
      if (b.s < e && b.e > s) return false;
    }
    return true;
  }

  // Prefer hours 18..22 VN first (typical evening window). If none free, accept
  // any free 2h slot.
  function vnHour(ms: number): number {
    return new Date(ms + VN_OFFSET_MS).getUTCHours();
  }

  let firstAny: FreeOverlap | null = null;
  for (let t = startMs; t + SLOT_HOURS * 3_600_000 <= endMs; t += 3_600_000) {
    const e = t + SLOT_HOURS * 3_600_000;
    if (!isFree(t, e)) continue;
    const h = vnHour(t);
    if (h >= 18 && h <= 21) {
      return { start_at: new Date(t).toISOString(), end_at: new Date(e).toISOString() };
    }
    if (!firstAny) {
      firstAny = { start_at: new Date(t).toISOString(), end_at: new Date(e).toISOString() };
    }
  }
  if (firstAny) return firstAny;

  // Fallback: tomorrow 19:00 VN.
  const todayVn = new Date(now + VN_OFFSET_MS);
  const tomorrow = Date.UTC(
    todayVn.getUTCFullYear(),
    todayVn.getUTCMonth(),
    todayVn.getUTCDate() + 1,
    19, 0, 0
  ) - VN_OFFSET_MS;
  return {
    start_at: new Date(tomorrow).toISOString(),
    end_at: new Date(tomorrow + SLOT_HOURS * 3_600_000).toISOString(),
  };
}
