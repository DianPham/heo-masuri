"use client";

/**
 * WeekHourView — mobile vertical-scroll week grid at hour or 30-min granularity.
 * Blueprint §6.3 / §6.4.
 *
 * Layout: 7 columns (Mon–Sun) × N rows (24 hours or 48 half-hours).
 * Owner's events render in pink. Partner's events render in lilac (busy-only
 * by default; details only visible if partner opted into share_details).
 *
 * CP3 interactions:
 *  - Tap empty owner cell → create a `manual` event covering that slot
 *  - Tap owner cell that has an event → delete the event
 *  - Partner cells are read-only
 *
 * Drag-to-range and long-press detail-sheet land in a follow-up (§6.4 mobile
 * polish, slotted for CP4).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { VisibleEvent } from "@/lib/calendar";

type Props = {
  monday: string;              // YYYY-MM-DD VN
  events: VisibleEvent[];
  viewerId: string;
  slotMinutes: 30 | 60;
  onChange: () => void;
};

const WEEKDAY_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const ROW_HEIGHT_PX = 28;

/** Returns Mon-anchored day index 0-6 for a UTC timestamp interpreted in VN. */
function vnDayIndex(iso: string, mondayMs: number): number {
  const dayMs = new Date(iso).getTime() - mondayMs;
  return Math.floor(dayMs / 86_400_000);
}

export function WeekHourView({ monday, events, viewerId, slotMinutes, onChange }: Props) {
  void viewerId; // is_own already pre-computed by the server-side visibility filter
  const slotsPerDay = 1440 / slotMinutes;
  const totalSlots = slotsPerDay; // rows
  const scrollerRef = useRef<HTMLDivElement>(null);

  const mondayMs = useMemo(
    () => Date.UTC(Number(monday.slice(0, 4)), Number(monday.slice(5, 7)) - 1, Number(monday.slice(8, 10))),
    [monday]
  );

  // Scroll to (now - 1h) on first paint
  useEffect(() => {
    const nowVn = new Date(Date.now() + 7 * 3_600_000);
    const todayIdx = (nowVn.getUTCDay() || 7) - 1;
    const currentMonday = Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate() - todayIdx);
    if (currentMonday !== mondayMs) return; // viewing a non-current week → leave at top

    const nowMinutes = nowVn.getUTCHours() * 60 + nowVn.getUTCMinutes();
    const targetMinutes = Math.max(0, nowMinutes - 60);
    const targetRow = Math.floor(targetMinutes / slotMinutes);
    scrollerRef.current?.scrollTo({ top: targetRow * ROW_HEIGHT_PX, behavior: "instant" as ScrollBehavior });
  }, [mondayMs, slotMinutes]);

  // Index events by [day][slot] → event id. Each event marks every slot it covers.
  const grid = useMemo(() => {
    const g: Array<Array<{ ownerEventIds: string[]; partnerEventIds: string[] }>> = [];
    for (let d = 0; d < 7; d++) {
      g.push(Array.from({ length: totalSlots }, () => ({ ownerEventIds: [], partnerEventIds: [] })));
    }
    for (const e of events) {
      const startDay = vnDayIndex(e.start_at, mondayMs);
      const endDay = vnDayIndex(e.end_at, mondayMs);
      // Iterate over each day the event touches in [0,6]
      for (let d = Math.max(0, startDay); d <= Math.min(6, endDay); d++) {
        const dayStartMs = mondayMs + d * 86_400_000;
        const dayEndMs = dayStartMs + 86_400_000;
        const slotStart = Math.max(new Date(e.start_at).getTime(), dayStartMs);
        const slotEnd = Math.min(new Date(e.end_at).getTime(), dayEndMs);
        const startMins = Math.floor((slotStart - dayStartMs) / 60_000);
        const endMins = Math.ceil((slotEnd - dayStartMs) / 60_000);
        const startRow = Math.floor(startMins / slotMinutes);
        const endRow = Math.min(totalSlots, Math.ceil(endMins / slotMinutes));
        for (let r = startRow; r < endRow; r++) {
          if (e.is_own) g[d][r].ownerEventIds.push(e.id);
          else g[d][r].partnerEventIds.push(e.id);
        }
      }
    }
    return g;
  }, [events, mondayMs, totalSlots, slotMinutes]);

  // Build day-label dates (for sticky header)
  const dayLabels = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mondayMs + i * 86_400_000);
      const isToday = (() => {
        const nowVn = new Date(Date.now() + 7 * 3_600_000);
        return (
          d.getUTCFullYear() === nowVn.getUTCFullYear() &&
          d.getUTCMonth() === nowVn.getUTCMonth() &&
          d.getUTCDate() === nowVn.getUTCDate()
        );
      })();
      return { label: WEEKDAY_VI[i], date: d.getUTCDate(), isToday };
    });
  }, [mondayMs]);

  // Now-indicator row (only if current week)
  const nowRow = useMemo(() => {
    const nowVn = new Date(Date.now() + 7 * 3_600_000);
    const todayIdx = (nowVn.getUTCDay() || 7) - 1;
    const currentMonday = Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate() - todayIdx);
    if (currentMonday !== mondayMs) return null;
    const minutes = nowVn.getUTCHours() * 60 + nowVn.getUTCMinutes();
    return { day: todayIdx, top: (minutes / slotMinutes) * ROW_HEIGHT_PX };
  }, [mondayMs, slotMinutes]);

  // Tap handler
  const [busy, setBusy] = useState<string | null>(null);
  async function handleCellTap(day: number, slot: number) {
    const cell = grid[day][slot];
    // Partner-only cells: read-only
    if (cell.ownerEventIds.length === 0 && cell.partnerEventIds.length > 0) return;

    setBusy(`${day}-${slot}`);
    try {
      if (cell.ownerEventIds.length > 0) {
        // Delete the first owner event covering this cell (CP3 simple semantic)
        const id = cell.ownerEventIds[0];
        await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      } else {
        // Create a slot-sized event
        const dayStartMs = mondayMs + day * 86_400_000;
        const startMs = dayStartMs + slot * slotMinutes * 60_000 - 7 * 3_600_000;
        const endMs = startMs + slotMinutes * 60_000;
        await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_at: new Date(startMs).toISOString(),
            end_at: new Date(endMs).toISOString(),
            source: "manual",
          }),
        });
      }
      onChange();
    } finally {
      setBusy(null);
    }
  }

  // Hour labels (every full hour, even at 30-min granularity)
  const hourLabels = useMemo(() => {
    const labels: { row: number; text: string }[] = [];
    for (let h = 0; h < 24; h++) {
      labels.push({ row: (h * 60) / slotMinutes, text: `${h.toString().padStart(2, "0")}:00` });
    }
    return labels;
  }, [slotMinutes]);

  return (
    <div className="px-2">
      {/* Sticky day-header strip */}
      <div className="sticky top-[112px] z-10 grid grid-cols-[40px_repeat(7,1fr)] gap-0 mb-1" style={{ backgroundColor: "rgba(255,249,245,0.94)" }}>
        <div />
        {dayLabels.map((dl, i) => (
          <div key={i} className="text-center pt-1 pb-1">
            <p className="text-xs font-semibold text-ink-soft">{dl.label}</p>
            <p
              className="text-sm font-bold mt-0.5"
              style={{ color: dl.isToday ? "#C4667A" : "#333" }}
            >
              {dl.date}
            </p>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollerRef} className="relative" style={{ maxHeight: "calc(100dvh - 220px)", overflowY: "auto" }}>
        <div
          className="grid grid-cols-[40px_repeat(7,1fr)] gap-0 relative"
          style={{ gridAutoRows: `${ROW_HEIGHT_PX}px` }}
        >
          {Array.from({ length: totalSlots }).map((_, row) => (
            <RowFragment
              key={row}
              row={row}
              slotMinutes={slotMinutes}
              hourLabels={hourLabels}
              grid={grid}
              busy={busy}
              onTap={handleCellTap}
            />
          ))}

          {/* Now indicator */}
          {nowRow && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: nowRow.top,
                left: `calc(40px + ${nowRow.day} * ((100% - 40px) / 7))`,
                width: `calc((100% - 40px) / 7)`,
                height: 1.5,
                backgroundColor: "#E97A95",
                boxShadow: "0 0 6px rgba(233,122,149,0.5)",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RowFragment({
  row,
  slotMinutes,
  hourLabels,
  grid,
  busy,
  onTap,
}: {
  row: number;
  slotMinutes: 30 | 60;
  hourLabels: { row: number; text: string }[];
  grid: Array<Array<{ ownerEventIds: string[]; partnerEventIds: string[] }>>;
  busy: string | null;
  onTap: (day: number, slot: number) => void;
}) {
  const hourLabel = hourLabels.find((h) => h.row === row);
  const isHalfHour = slotMinutes === 30 && row % 2 === 1;

  return (
    <>
      <div className="text-[10px] text-ink-soft text-right pr-1 leading-none flex items-start justify-end pt-0.5">
        {hourLabel && !isHalfHour ? hourLabel.text : ""}
      </div>
      {grid.map((dayCells, day) => {
        const cell = dayCells[row];
        const ownerBusy = cell.ownerEventIds.length > 0;
        const partnerBusy = cell.partnerEventIds.length > 0;
        const isBusyCell = ownerBusy || partnerBusy;
        const overlap = ownerBusy && partnerBusy;
        const cellBg = overlap
          ? "rgba(196,168,220,0.7)"
          : ownerBusy
          ? "rgba(255,201,213,0.85)"
          : partnerBusy
          ? "rgba(196,168,220,0.4)"
          : "transparent";
        const isBusyId = busy === `${day}-${row}`;

        return (
          <button
            key={day}
            onClick={() => onTap(day, row)}
            disabled={isBusyId}
            className="border-r border-b transition-colors active:opacity-70"
            style={{
              borderColor: "rgba(255,201,213,0.25)",
              backgroundColor: cellBg,
              opacity: isBusyId ? 0.5 : 1,
              cursor: !ownerBusy && partnerBusy ? "default" : "pointer",
            }}
            aria-label={isBusyCell ? "Bận" : "Trống"}
          />
        );
      })}
    </>
  );
}
