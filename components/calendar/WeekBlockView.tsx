"use client";

/**
 * WeekBlockView — block-mode mobile calendar. 7 days × 4 large pill buttons
 * (Morning / Afternoon / Evening / Late). Blueprint §6.3.
 *
 * Each block is a fixed time range (in VN local time):
 *   Morning   08:00 – 12:00
 *   Afternoon 12:00 – 17:00
 *   Evening   17:00 – 21:00
 *   Late      21:00 – 24:00
 *
 * Tap an own block → if no event covers it, create a quick_block-source
 * event for that range; if an event already covers it, delete the first such
 * owner event. Partner blocks render as busy state only (read-only).
 */
import { useMemo, useState } from "react";
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

function dayIndex(iso: string, mondayMs: number): number {
  return Math.floor((new Date(iso).getTime() - mondayMs) / 86_400_000);
}

export function WeekBlockView({ monday, events, viewerId, onChange }: Props) {
  void viewerId; // owner gating already provided by is_own on the event
  const mondayMs = useMemo(
    () => Date.UTC(Number(monday.slice(0, 4)), Number(monday.slice(5, 7)) - 1, Number(monday.slice(8, 10))),
    [monday]
  );

  /** Build a [day][block] map of overlapping events split into owner/partner buckets. */
  const grid = useMemo(() => {
    const g: Record<string, { ownerEventIds: string[]; partnerEventIds: string[] }>[] = Array.from(
      { length: 7 },
      () => ({} as Record<string, { ownerEventIds: string[]; partnerEventIds: string[] }>)
    );
    for (let d = 0; d < 7; d++) {
      for (const b of BLOCKS) g[d][b.key] = { ownerEventIds: [], partnerEventIds: [] };
    }
    for (const e of events) {
      const startDay = dayIndex(e.start_at, mondayMs);
      const endDay = dayIndex(e.end_at, mondayMs);
      for (let d = Math.max(0, startDay); d <= Math.min(6, endDay); d++) {
        const dayStartMs = mondayMs + d * 86_400_000;
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
  }, [events, mondayMs]);

  const [busy, setBusy] = useState<string | null>(null);

  async function handleBlockTap(day: number, blockKey: BlockKey) {
    const cell = grid[day][blockKey];
    if (cell.ownerEventIds.length === 0 && cell.partnerEventIds.length > 0) return;

    setBusy(`${day}-${blockKey}`);
    try {
      const block = BLOCKS.find((b) => b.key === blockKey)!;
      if (cell.ownerEventIds.length > 0) {
        const id = cell.ownerEventIds[0];
        await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      } else {
        const dayStartMs = mondayMs + day * 86_400_000;
        const startMs = dayStartMs + block.startMin * 60_000 - 7 * 3_600_000;
        const endMs = dayStartMs + block.endMin * 60_000 - 7 * 3_600_000;
        await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_at: new Date(startMs).toISOString(),
            end_at: new Date(endMs).toISOString(),
            source: "quick_block",
          }),
        });
      }
      onChange();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {Array.from({ length: 7 }).map((_, d) => {
        const dayMs = mondayMs + d * 86_400_000;
        const date = new Date(dayMs);
        const nowVn = new Date(Date.now() + 7 * 3_600_000);
        const isToday =
          date.getUTCFullYear() === nowVn.getUTCFullYear() &&
          date.getUTCMonth() === nowVn.getUTCMonth() &&
          date.getUTCDate() === nowVn.getUTCDate();
        return (
          <section
            key={d}
            className="rounded-2xl p-3"
            style={{
              backgroundColor: "white",
              border: `1px solid ${isToday ? "rgba(255,201,213,0.7)" : "rgba(255,201,213,0.3)"}`,
              boxShadow: isToday ? "0 4px 16px rgba(196,102,122,0.08)" : "var(--shadow)",
            }}
          >
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-xs font-semibold text-ink-soft">{WEEKDAY_VI[d]}</p>
              <p className="text-base font-bold" style={{ color: isToday ? "#C4667A" : "#333" }}>
                {date.getUTCDate()}/{date.getUTCMonth() + 1}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BLOCKS.map((b) => {
                const cell = grid[d][b.key];
                const ownerBusy = cell.ownerEventIds.length > 0;
                const partnerBusy = cell.partnerEventIds.length > 0;
                const overlap = ownerBusy && partnerBusy;
                const bg = overlap
                  ? "rgba(196,168,220,0.7)"
                  : ownerBusy
                  ? "rgba(255,201,213,0.85)"
                  : partnerBusy
                  ? "rgba(196,168,220,0.4)"
                  : "rgba(250,250,250,0.7)";
                const label =
                  overlap ? "Cả hai bận"
                  : ownerBusy ? "Bạn bận"
                  : partnerBusy ? "Người kia bận"
                  : "Trống";
                const isBusyId = busy === `${d}-${b.key}`;
                return (
                  <button
                    key={b.key}
                    onClick={() => handleBlockTap(d, b.key)}
                    disabled={isBusyId}
                    className="rounded-xl px-3 py-3 text-left transition-colors active:opacity-70"
                    style={{
                      backgroundColor: bg,
                      opacity: isBusyId ? 0.5 : 1,
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
