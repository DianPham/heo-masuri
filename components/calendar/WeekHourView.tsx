"use client";

/**
 * WeekHourView — mobile vertical-scroll week grid at hour or 30-min granularity.
 * Blueprint §6.3 / §6.4.
 *
 * Layout: 7 columns (Mon–Sun) × N rows (24 hours or 48 half-hours).
 * Owner's events render in pink. Partner's events render in lilac (busy-only
 * by default; details only visible if partner opted into share_details).
 *
 * CP3 interactions (with CP3 round-2 polish):
 *  - Tap empty owner cell → optimistically mark busy, create event in background
 *  - Tap owner cell that has an event → optimistically clear, delete in background
 *  - Partner cells are read-only
 *
 * Timezone anchoring: ALL day math runs off `mondayVnMs` (UTC ms representing
 * VN midnight of the displayed Monday). The previous code mixed UTC-anchored
 * grid render with VN-anchored click handlers — clicking "17:00" stored
 * 17:00 VN correctly but the grid rendered the mark at row 10 because it
 * used UTC midnight as the day origin.
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

/** Day index (0-6, Mon=0) for an event timestamp, anchored on VN midnight. */
function vnDayIndex(iso: string, mondayVnMs: number): number {
  return Math.floor((new Date(iso).getTime() - mondayVnMs) / 86_400_000);
}

export function WeekHourView({ monday, events, viewerId, slotMinutes, onChange }: Props) {
  const slotsPerDay = 1440 / slotMinutes;
  const totalSlots = slotsPerDay;
  const scrollerRef = useRef<HTMLDivElement>(null);

  // UTC ms representing VN 00:00 of the displayed Monday.
  // (Date.UTC of a date is its UTC midnight, which is VN 07:00 — subtract 7h.)
  const mondayVnMs = useMemo(
    () =>
      Date.UTC(
        Number(monday.slice(0, 4)),
        Number(monday.slice(5, 7)) - 1,
        Number(monday.slice(8, 10))
      ) - 7 * 3_600_000,
    [monday]
  );

  // Optimistic event mirror — used as the render source. Resyncs to server
  // truth on every prop update from the parent reload().
  const [optimisticEvents, setOptimisticEvents] = useState<VisibleEvent[]>(events);
  useEffect(() => setOptimisticEvents(events), [events]);

  // Scroll to (now - 1h) on first paint of the current week.
  useEffect(() => {
    const nowVnMs = Date.now();
    const currentMondayVnMs = (() => {
      const nv = new Date(nowVnMs + 7 * 3_600_000);
      const dow = nv.getUTCDay() || 7;
      const m = new Date(nv);
      m.setUTCDate(nv.getUTCDate() - (dow - 1));
      return Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()) - 7 * 3_600_000;
    })();
    if (currentMondayVnMs !== mondayVnMs) return;

    const nowVn = new Date(nowVnMs + 7 * 3_600_000);
    const nowMinutes = nowVn.getUTCHours() * 60 + nowVn.getUTCMinutes();
    const targetMinutes = Math.max(0, nowMinutes - 60);
    const targetRow = Math.floor(targetMinutes / slotMinutes);
    scrollerRef.current?.scrollTo({ top: targetRow * ROW_HEIGHT_PX, behavior: "instant" as ScrollBehavior });
  }, [mondayVnMs, slotMinutes]);

  // [day][slot] → event ids, split by ownership.
  const grid = useMemo(() => {
    const g: Array<Array<{ ownerEventIds: string[]; partnerEventIds: string[] }>> = [];
    for (let d = 0; d < 7; d++) {
      g.push(Array.from({ length: totalSlots }, () => ({ ownerEventIds: [], partnerEventIds: [] })));
    }
    for (const e of optimisticEvents) {
      const startDay = vnDayIndex(e.start_at, mondayVnMs);
      const endDay = vnDayIndex(e.end_at, mondayVnMs);
      for (let d = Math.max(0, startDay); d <= Math.min(6, endDay); d++) {
        const dayStartMs = mondayVnMs + d * 86_400_000;
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
  }, [optimisticEvents, mondayVnMs, totalSlots, slotMinutes]);

  // Day labels — derive the date label from VN midnight + i days.
  const dayLabels = useMemo(() => {
    const nowVn = new Date(Date.now() + 7 * 3_600_000);
    const todayKey = `${nowVn.getUTCFullYear()}-${nowVn.getUTCMonth()}-${nowVn.getUTCDate()}`;
    return Array.from({ length: 7 }, (_, i) => {
      const dayVn = new Date(mondayVnMs + i * 86_400_000 + 7 * 3_600_000);
      const key = `${dayVn.getUTCFullYear()}-${dayVn.getUTCMonth()}-${dayVn.getUTCDate()}`;
      return { label: WEEKDAY_VI[i], date: dayVn.getUTCDate(), isToday: key === todayKey };
    });
  }, [mondayVnMs]);

  // Now-indicator — only when current week is in view.
  const nowRow = useMemo(() => {
    const nowVn = new Date(Date.now() + 7 * 3_600_000);
    const dow = nowVn.getUTCDay() || 7;
    const todayIdx = dow - 1;
    const currentMonday = new Date(nowVn);
    currentMonday.setUTCDate(nowVn.getUTCDate() - todayIdx);
    const currentMondayVnMs =
      Date.UTC(currentMonday.getUTCFullYear(), currentMonday.getUTCMonth(), currentMonday.getUTCDate()) -
      7 * 3_600_000;
    if (currentMondayVnMs !== mondayVnMs) return null;
    const minutes = nowVn.getUTCHours() * 60 + nowVn.getUTCMinutes();
    return { day: todayIdx, top: (minutes / slotMinutes) * ROW_HEIGHT_PX };
  }, [mondayVnMs, slotMinutes]);

  // Tap handler with optimistic update + background persist.
  async function handleCellTap(day: number, slot: number) {
    const cell = grid[day][slot];
    if (cell.ownerEventIds.length === 0 && cell.partnerEventIds.length > 0) return;

    if (cell.ownerEventIds.length > 0) {
      const id = cell.ownerEventIds[0];
      setOptimisticEvents((prev) => prev.filter((e) => e.id !== id));
      fetch(`/api/calendar/events/${id}`, { method: "DELETE" })
        .then(() => onChange())
        .catch(() => onChange()); // re-sync to truth on either path
    } else {
      const dayStartMs = mondayVnMs + day * 86_400_000;
      const startMs = dayStartMs + slot * slotMinutes * 60_000;
      const endMs = startMs + slotMinutes * 60_000;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimistic: VisibleEvent = {
        id: tempId,
        owner: viewerId,
        start_at: new Date(startMs).toISOString(),
        end_at: new Date(endMs).toISOString(),
        source: "manual",
        title: null,
        note: null,
        emoji: null,
        share_details: false,
        is_own: true,
      };
      setOptimisticEvents((prev) => [...prev, optimistic]);
      fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: optimistic.start_at,
          end_at: optimistic.end_at,
          source: "manual",
        }),
      })
        .then(() => onChange())
        .catch(() => onChange());
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
      <div
        className="sticky top-[112px] z-10 grid grid-cols-[40px_repeat(7,1fr)] gap-0 mb-1"
        style={{ backgroundColor: "rgba(255,249,245,0.94)" }}
      >
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
              onTap={handleCellTap}
            />
          ))}

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
  onTap,
}: {
  row: number;
  slotMinutes: 30 | 60;
  hourLabels: { row: number; text: string }[];
  grid: Array<Array<{ ownerEventIds: string[]; partnerEventIds: string[] }>>;
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

        return (
          <button
            key={day}
            onClick={() => onTap(day, row)}
            className="border-r border-b transition-colors active:opacity-70"
            style={{
              borderColor: "rgba(255,201,213,0.25)",
              backgroundColor: cellBg,
              cursor: !ownerBusy && partnerBusy ? "default" : "pointer",
            }}
            aria-label={isBusyCell ? "Bận" : "Trống"}
          />
        );
      })}
    </>
  );
}
