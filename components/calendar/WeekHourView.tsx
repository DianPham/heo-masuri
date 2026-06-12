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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VisibleEvent } from "@/lib/calendar";
import { EventDetailSheet, type EventDetailValues } from "./EventDetailSheet";

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

  // Long-press → open sheet. Timer fires after 500ms of contact. Touch-move
  // or release before then cancels (so scrolling doesn't pop the sheet).
  type SheetState =
    | { mode: "create"; start_at: string; end_at: string }
    | {
        mode: "edit";
        id: string;
        start_at: string;
        end_at: string;
        title: string | null;
        note: string | null;
        emoji: string | null;
        share_details: boolean;
      };
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startLongPress = useCallback(
    (day: number, slot: number) => {
      cancelLongPress();
      longPressedRef.current = false;
      longPressTimerRef.current = window.setTimeout(() => {
        longPressedRef.current = true;
        const dayStartMs = mondayVnMs + day * 86_400_000;
        const cellStartMs = dayStartMs + slot * slotMinutes * 60_000;
        const cellEndMs = cellStartMs + slotMinutes * 60_000;
        // If cell has an own event, open edit; else create.
        const ownerCell = optimisticEvents.find((e) => {
          if (!e.is_own) return false;
          const s = new Date(e.start_at).getTime();
          const en = new Date(e.end_at).getTime();
          return s < cellEndMs && en > cellStartMs && !e.id.startsWith("temp-");
        });
        if (ownerCell) {
          setSheet({
            mode: "edit",
            id: ownerCell.id,
            start_at: ownerCell.start_at,
            end_at: ownerCell.end_at,
            title: ownerCell.title,
            note: ownerCell.note,
            emoji: ownerCell.emoji,
            share_details: ownerCell.share_details,
          });
        } else {
          setSheet({
            mode: "create",
            start_at: new Date(cellStartMs).toISOString(),
            end_at: new Date(cellEndMs).toISOString(),
          });
        }
      }, 500);
    },
    [cancelLongPress, mondayVnMs, optimisticEvents, slotMinutes]
  );

  async function handleSheetSave(values: EventDetailValues): Promise<boolean> {
    if (!sheet) return false;
    if (sheet.mode === "create") {
      try {
        const res = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_at: sheet.start_at,
            end_at: sheet.end_at,
            source: "manual",
            ...values,
          }),
        });
        if (!res.ok) { alert("Lưu thất bại"); return false; }
        const data = await res.json();
        setOptimisticEvents((prev) => [...prev, data.event]);
        return true;
      } catch { alert("Lỗi mạng"); return false; }
    } else {
      try {
        const res = await fetch(`/api/calendar/events/${sheet.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) { alert("Lưu thất bại"); return false; }
        const data = await res.json();
        setOptimisticEvents((prev) => prev.map((e) => (e.id === sheet.id ? data.event : e)));
        return true;
      } catch { alert("Lỗi mạng"); return false; }
    }
  }

  async function handleSheetDelete() {
    if (!sheet || sheet.mode !== "edit") return;
    const id = sheet.id;
    try {
      const res = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      if (res.ok) setOptimisticEvents((prev) => prev.filter((e) => e.id !== id));
    } catch { /* swallow */ }
  }

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

  // [day][slot] → event ids + sub-cell fill ranges (top + height as 0..1
  // fractions of the cell). A 30-min event at 17:30 in the 1-hour cell labeled
  // "17:00" renders as `{ top: 0.5, height: 0.5 }` — the bottom half filled.
  type CellState = {
    ownerEventIds: string[];
    partnerEventIds: string[];
    ownerRanges: Array<{ top: number; height: number }>;
    partnerRanges: Array<{ top: number; height: number }>;
  };
  const grid = useMemo(() => {
    const g: CellState[][] = [];
    for (let d = 0; d < 7; d++) {
      g.push(
        Array.from({ length: totalSlots }, () => ({
          ownerEventIds: [],
          partnerEventIds: [],
          ownerRanges: [],
          partnerRanges: [],
        }))
      );
    }
    for (const e of optimisticEvents) {
      const startDay = vnDayIndex(e.start_at, mondayVnMs);
      const endDay = vnDayIndex(e.end_at, mondayVnMs);
      for (let d = Math.max(0, startDay); d <= Math.min(6, endDay); d++) {
        const dayStartMs = mondayVnMs + d * 86_400_000;
        const dayEndMs = dayStartMs + 86_400_000;
        const eStartInDay = Math.max(new Date(e.start_at).getTime(), dayStartMs);
        const eEndInDay = Math.min(new Date(e.end_at).getTime(), dayEndMs);
        const eStartMin = (eStartInDay - dayStartMs) / 60_000;
        const eEndMin = (eEndInDay - dayStartMs) / 60_000;
        const firstRow = Math.max(0, Math.floor(eStartMin / slotMinutes));
        const lastRow = Math.min(totalSlots - 1, Math.ceil(eEndMin / slotMinutes) - 1);
        for (let r = firstRow; r <= lastRow; r++) {
          const rowStartMin = r * slotMinutes;
          const rowEndMin = rowStartMin + slotMinutes;
          const overlapStart = Math.max(rowStartMin, eStartMin);
          const overlapEnd = Math.min(rowEndMin, eEndMin);
          if (overlapEnd <= overlapStart) continue;
          const top = (overlapStart - rowStartMin) / slotMinutes;
          const height = (overlapEnd - overlapStart) / slotMinutes;
          if (e.is_own) {
            g[d][r].ownerEventIds.push(e.id);
            g[d][r].ownerRanges.push({ top, height });
          } else {
            g[d][r].partnerEventIds.push(e.id);
            g[d][r].partnerRanges.push({ top, height });
          }
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

  // Tap handler. Local optimistic state IS the source of truth — we don't
  // call onChange after taps, so no reload→repaint flicker. Persistence
  // runs in the background; only on failure do we revert.
  async function handleCellTap(day: number, slot: number) {
    // Suppress click after a long-press; the sheet opened instead.
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    const cell = grid[day][slot];
    const dayStartMs = mondayVnMs + day * 86_400_000;
    const cellStartMs = dayStartMs + slot * slotMinutes * 60_000;
    const cellEndMs = cellStartMs + slotMinutes * 60_000;

    if (cell.ownerEventIds.length > 0) {
      // Cell is currently part of one of YOUR events. Unblock just this slice:
      // split the underlying event into [start, cellStart] + [cellEnd, end].
      // Removes whichever halves are empty.
      const eventId = cell.ownerEventIds[0];
      const event = optimisticEvents.find((e) => e.id === eventId);
      if (!event) return;

      const eStartMs = new Date(event.start_at).getTime();
      const eEndMs = new Date(event.end_at).getTime();
      const ranges: Array<{ start: number; end: number }> = [];
      if (eStartMs < cellStartMs) ranges.push({ start: eStartMs, end: cellStartMs });
      if (eEndMs > cellEndMs) ranges.push({ start: cellEndMs, end: eEndMs });

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

      // Persist: delete the original (skip if it was a temp), POST the splits.
      // On any error, revert optimistic to before the tap.
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

    // Empty cell OR partner-only cell. Both create a new own event.
    // Partner-only is intentionally clickable now — you can overlay your busy
    // on top of theirs (Bug 2). The cell will then render as the overlap color.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: VisibleEvent = {
      id: tempId,
      owner: viewerId,
      start_at: new Date(cellStartMs).toISOString(),
      end_at: new Date(cellEndMs).toISOString(),
      source: "manual",
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
          source: "manual",
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

  // Suppress the unused-prop ESLint warning. onChange is still wired so the
  // FAB and week-nav can force a refresh; cell taps just don't use it.
  void onChange;

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
              onLongPressStart={startLongPress}
              onLongPressCancel={cancelLongPress}
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

      {sheet && (
        <EventDetailSheet
          initial={sheet}
          onSave={handleSheetSave}
          onDelete={sheet.mode === "edit" ? handleSheetDelete : undefined}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

type CellShape = {
  ownerEventIds: string[];
  partnerEventIds: string[];
  ownerRanges: Array<{ top: number; height: number }>;
  partnerRanges: Array<{ top: number; height: number }>;
};

function RowFragment({
  row,
  slotMinutes,
  hourLabels,
  grid,
  onTap,
  onLongPressStart,
  onLongPressCancel,
}: {
  row: number;
  slotMinutes: 30 | 60;
  hourLabels: { row: number; text: string }[];
  grid: CellShape[][];
  onTap: (day: number, slot: number) => void;
  onLongPressStart: (day: number, row: number) => void;
  onLongPressCancel: () => void;
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
        const isReadonly = !ownerBusy && partnerBusy;

        return (
          <button
            key={day}
            onClick={() => onTap(day, row)}
            onTouchStart={() => onLongPressStart(day, row)}
            onTouchMove={onLongPressCancel}
            onTouchEnd={onLongPressCancel}
            onTouchCancel={onLongPressCancel}
            onContextMenu={(e) => e.preventDefault()}
            className="border-r border-b transition-colors active:opacity-70 relative overflow-hidden"
            style={{
              borderColor: "rgba(255,201,213,0.25)",
              backgroundColor: "transparent",
              cursor: isReadonly ? "default" : "pointer",
            }}
            aria-label={isBusyCell ? "Bận" : "Trống"}
          >
            {/* Partner fills paint first (background, blue), owner fills paint on top (pink). */}
            {cell.partnerRanges.map((r, i) => (
              <span
                key={`p${i}`}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${r.top * 100}%`,
                  height: `${r.height * 100}%`,
                  backgroundColor: "rgba(120,175,220,0.55)",
                }}
              />
            ))}
            {cell.ownerRanges.map((r, i) => (
              <span
                key={`o${i}`}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${r.top * 100}%`,
                  height: `${r.height * 100}%`,
                  // When both overlap, mix to purple so it's distinguishable from both single cases.
                  backgroundColor: ownerBusy && partnerBusy
                    ? "rgba(180,130,200,0.85)"
                    : "rgba(255,201,213,0.85)",
                }}
              />
            ))}
          </button>
        );
      })}
    </>
  );
}
