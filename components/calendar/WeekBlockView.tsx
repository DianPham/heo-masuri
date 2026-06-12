"use client";

/**
 * WeekBlockView — block-mode mobile calendar. 7 day cards × 4 large pill
 * buttons each. Blueprint §6.3.
 *
 * Same timezone anchoring fix as WeekHourView: mondayVnMs = UTC ms of VN
 * 00:00 Monday. All event placement math derives from it.
 *
 * Round-2 polish:
 *  - Optimistic UI on tap (apply visual state, persist in background)
 *  - Today card border / shadow upgraded for clearer "you're here" cue
 */
import { useEffect, useMemo, useState } from "react";
import type { VisibleEvent } from "@/lib/calendar";

const BLOCKS = [
  { key: "morning",   label: "Sáng",      startMin: 8 * 60,  endMin: 12 * 60 },
  { key: "afternoon", label: "Chiều",     startMin: 12 * 60, endMin: 17 * 60 },
  { key: "evening",   label: "Tối",       startMin: 17 * 60, endMin: 21 * 60 },
  { key: "late",      label: "Đêm khuya", startMin: 21 * 60, endMin: 24 * 60 },
] as const;

type BlockKey = (typeof BLOCKS)[number]["key"];
const WEEKDAY_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type Props = {
  monday: string;
  events: VisibleEvent[];
  viewerId: string;
  onChange: () => void;
};

function dayIndex(iso: string, mondayVnMs: number): number {
  return Math.floor((new Date(iso).getTime() - mondayVnMs) / 86_400_000);
}

export function WeekBlockView({ monday, events, viewerId, onChange }: Props) {
  const mondayVnMs = useMemo(
    () =>
      Date.UTC(
        Number(monday.slice(0, 4)),
        Number(monday.slice(5, 7)) - 1,
        Number(monday.slice(8, 10))
      ) - 7 * 3_600_000,
    [monday]
  );

  // Optimistic mirror; resyncs on prop update from parent reload().
  const [optimisticEvents, setOptimisticEvents] = useState<VisibleEvent[]>(events);
  useEffect(() => setOptimisticEvents(events), [events]);

  const grid = useMemo(() => {
    const g: Record<string, { ownerEventIds: string[]; partnerEventIds: string[] }>[] = Array.from(
      { length: 7 },
      () => ({} as Record<string, { ownerEventIds: string[]; partnerEventIds: string[] }>)
    );
    for (let d = 0; d < 7; d++) {
      for (const b of BLOCKS) g[d][b.key] = { ownerEventIds: [], partnerEventIds: [] };
    }
    for (const e of optimisticEvents) {
      const startDay = dayIndex(e.start_at, mondayVnMs);
      const endDay = dayIndex(e.end_at, mondayVnMs);
      for (let d = Math.max(0, startDay); d <= Math.min(6, endDay); d++) {
        const dayStartMs = mondayVnMs + d * 86_400_000;
        const dayEndMs = dayStartMs + 86_400_000;
        const eStart = Math.max(new Date(e.start_at).getTime(), dayStartMs);
        const eEnd = Math.min(new Date(e.end_at).getTime(), dayEndMs);
        const eStartMin = Math.floor((eStart - dayStartMs) / 60_000);
        const eEndMin = Math.ceil((eEnd - dayStartMs) / 60_000);
        for (const b of BLOCKS) {
          const overlap = Math.max(0, Math.min(b.endMin, eEndMin) - Math.max(b.startMin, eStartMin));
          if (overlap > 0) {
            if (e.is_own) g[d][b.key].ownerEventIds.push(e.id);
            else g[d][b.key].partnerEventIds.push(e.id);
          }
        }
      }
    }
    return g;
  }, [optimisticEvents, mondayVnMs]);

  async function handleBlockTap(day: number, blockKey: BlockKey) {
    const cell = grid[day][blockKey];
    const block = BLOCKS.find((b) => b.key === blockKey)!;
    const dayStartMs = mondayVnMs + day * 86_400_000;
    const blockStartMs = dayStartMs + block.startMin * 60_000;
    const blockEndMs = dayStartMs + block.endMin * 60_000;

    if (cell.ownerEventIds.length > 0) {
      // Unblock just this 4-hour block, split surrounding event(s) if larger.
      const eventId = cell.ownerEventIds[0];
      const event = optimisticEvents.find((e) => e.id === eventId);
      if (!event) return;

      const eStartMs = new Date(event.start_at).getTime();
      const eEndMs = new Date(event.end_at).getTime();
      const ranges: Array<{ start: number; end: number }> = [];
      if (eStartMs < blockStartMs) ranges.push({ start: eStartMs, end: blockStartMs });
      if (eEndMs > blockEndMs) ranges.push({ start: blockEndMs, end: eEndMs });

      const tempEvents: VisibleEvent[] = ranges.map((r) => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        owner: viewerId,
        start_at: new Date(r.start).toISOString(),
        end_at: new Date(r.end).toISOString(),
        source: event.source,
        title: event.title,
        note: event.note,
        emoji: event.emoji,
        share_details: event.share_details,
        is_own: true,
      }));

      setOptimisticEvents((prev) => [
        ...prev.filter((e) => e.id !== eventId),
        ...tempEvents,
      ]);

      const revert = () =>
        setOptimisticEvents((prev) => [
          ...prev.filter((e) => !tempEvents.some((t) => t.id === e.id)),
          event,
        ]);
      try {
        if (!eventId.startsWith("temp-")) {
          const del = await fetch(`/api/calendar/events/${eventId}`, { method: "DELETE" });
          if (!del.ok) {
            revert();
            return;
          }
        }
        for (const tmp of tempEvents) {
          const res = await fetch("/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ start_at: tmp.start_at, end_at: tmp.end_at, source: event.source }),
          });
          if (res.ok) {
            const data = await res.json();
            setOptimisticEvents((prev) =>
              prev.map((e) => (e.id === tmp.id ? data.event : e))
            );
          }
        }
      } catch {
        revert();
      }
      return;
    }

    // Empty block OR partner-only — both create an own event.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: VisibleEvent = {
      id: tempId,
      owner: viewerId,
      start_at: new Date(blockStartMs).toISOString(),
      end_at: new Date(blockEndMs).toISOString(),
      source: "quick_block",
      title: null,
      note: null,
      emoji: null,
      share_details: false,
      is_own: true,
    };
    setOptimisticEvents((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: optimistic.start_at,
          end_at: optimistic.end_at,
          source: "quick_block",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setOptimisticEvents((prev) =>
          prev.map((e) => (e.id === tempId ? data.event : e))
        );
      } else {
        setOptimisticEvents((prev) => prev.filter((e) => e.id !== tempId));
      }
    } catch {
      setOptimisticEvents((prev) => prev.filter((e) => e.id !== tempId));
    }
  }

  void onChange;

  // Today comparison via VN-anchored date keys (not getUTCDate() of a UTC ms).
  const { todayKey, todayMsVn } = useMemo(() => {
    const n = new Date(Date.now() + 7 * 3_600_000);
    const todayMsUtc = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
    return {
      todayKey: `${n.getUTCFullYear()}-${n.getUTCMonth()}-${n.getUTCDate()}`,
      todayMsVn: todayMsUtc - 7 * 3_600_000, // VN midnight of today in UTC ms
    };
  }, []);

  return (
    <div className="px-4 py-3 space-y-3">
      {Array.from({ length: 7 }).map((_, d) => {
        const dayMsVn = mondayVnMs + d * 86_400_000;
        // Past days suppress entirely — you can't (usefully) block-off the past.
        if (dayMsVn < todayMsVn) return null;
        const dayVn = new Date(dayMsVn + 7 * 3_600_000);
        const key = `${dayVn.getUTCFullYear()}-${dayVn.getUTCMonth()}-${dayVn.getUTCDate()}`;
        const isToday = key === todayKey;
        return (
          <section
            key={d}
            className="rounded-2xl p-3"
            style={{
              backgroundColor: "white",
              border: isToday
                ? "2.5px solid rgba(196,102,122,0.7)"
                : "1px solid rgba(255,201,213,0.3)",
              boxShadow: isToday
                ? "0 8px 24px rgba(196,102,122,0.25)"
                : "var(--shadow)",
            }}
          >
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-xs font-semibold text-ink-soft">{WEEKDAY_VI[d]}</p>
              <p
                className="text-base font-bold"
                style={{ color: isToday ? "#C4667A" : "#333" }}
              >
                {dayVn.getUTCDate()}/{dayVn.getUTCMonth() + 1}
              </p>
              {isToday && (
                <span
                  className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: "#C4667A" }}
                >
                  Hôm nay
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BLOCKS.map((b) => {
                const cell = grid[d][b.key];
                const ownerBusy = cell.ownerEventIds.length > 0;
                const partnerBusy = cell.partnerEventIds.length > 0;
                const overlap = ownerBusy && partnerBusy;
                const bg = overlap
                  ? "rgba(180,130,200,0.8)"     // pink + blue → purple
                  : ownerBusy
                  ? "rgba(255,201,213,0.85)"    // own busy → pink
                  : partnerBusy
                  ? "rgba(120,175,220,0.55)"    // partner busy → blue
                  : "rgba(250,250,250,0.7)";    // free → neutral
                const label = overlap
                  ? "Cả hai bận"
                  : ownerBusy
                  ? "Bạn bận"
                  : partnerBusy
                  ? "Người kia bận"
                  : "Trống";
                return (
                  <button
                    key={b.key}
                    onClick={() => handleBlockTap(d, b.key)}
                    className="rounded-xl px-3 py-3 text-left transition-colors active:opacity-70"
                    style={{
                      backgroundColor: bg,
                      border: "1px solid rgba(220,220,220,0.4)",
                      cursor: !ownerBusy && partnerBusy ? "default" : "pointer",
                    }}
                  >
                    <p className="text-xs font-semibold text-ink">{b.label}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{label}</p>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
