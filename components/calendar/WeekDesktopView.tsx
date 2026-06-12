"use client";

/**
 * WeekDesktopView — horizontal Google-Calendar-style week.
 * Blueprint §6.5.
 *
 * Layout: 7 day columns × N hour rows. Hours column on the far left, sticky
 * day headers along the top. Click an empty cell → create. Click an owner
 * cell → delete (CP4 v1; the §6.5 inline edit popover lands in a later
 * round). Now indicator paints across today's column.
 *
 * Shares mondayVnMs anchoring and the same fractional cell-fill model as
 * WeekHourView, so a 30-min event in 1-hour view shows the right half-cell.
 *
 * Keyboard handling lives in CalendarShell so the same shortcuts work
 * regardless of which view is rendered.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { VisibleEvent } from "@/lib/calendar";

type Props = {
  monday: string;
  events: VisibleEvent[];
  viewerId: string;
  slotMinutes: 30 | 60;
  onChange: () => void;
};

const WEEKDAY_VI_LONG = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const ROW_HEIGHT_PX = 44;          // taller rows than mobile — desktop has more vertical room
const HOUR_COL_WIDTH_PX = 60;

function vnDayIndex(iso: string, mondayVnMs: number): number {
  return Math.floor((new Date(iso).getTime() - mondayVnMs) / 86_400_000);
}

type CellState = {
  ownerEventIds: string[];
  partnerEventIds: string[];
  ownerRanges: Array<{ top: number; height: number }>;
  partnerRanges: Array<{ top: number; height: number }>;
};

export function WeekDesktopView({ monday, events, viewerId, slotMinutes, onChange }: Props) {
  const slotsPerDay = 1440 / slotMinutes;
  const totalSlots = slotsPerDay;
  const scrollerRef = useRef<HTMLDivElement>(null);

  const mondayVnMs = useMemo(
    () =>
      Date.UTC(
        Number(monday.slice(0, 4)),
        Number(monday.slice(5, 7)) - 1,
        Number(monday.slice(8, 10))
      ) - 7 * 3_600_000,
    [monday]
  );

  const [optimisticEvents, setOptimisticEvents] = useState<VisibleEvent[]>(events);
  useEffect(() => setOptimisticEvents(events), [events]);

  // Anchor scroll to (now - 1h) on current-week paint.
  useEffect(() => {
    const nowVn = new Date(Date.now() + 7 * 3_600_000);
    const dow = nowVn.getUTCDay() || 7;
    const currentMondayVnMs =
      Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate() - (dow - 1)) -
      7 * 3_600_000;
    if (currentMondayVnMs !== mondayVnMs) return;
    const nowMinutes = nowVn.getUTCHours() * 60 + nowVn.getUTCMinutes();
    const targetMinutes = Math.max(0, nowMinutes - 60);
    const targetRow = Math.floor(targetMinutes / slotMinutes);
    scrollerRef.current?.scrollTo({ top: targetRow * ROW_HEIGHT_PX, behavior: "instant" as ScrollBehavior });
  }, [mondayVnMs, slotMinutes]);

  // [day][slot] grid with sub-cell range tracking (same shape as WeekHourView).
  const grid = useMemo<CellState[][]>(() => {
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
          const rs = r * slotMinutes;
          const re = rs + slotMinutes;
          const oS = Math.max(rs, eStartMin);
          const oE = Math.min(re, eEndMin);
          if (oE <= oS) continue;
          const top = (oS - rs) / slotMinutes;
          const height = (oE - oS) / slotMinutes;
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

  const dayHeaders = useMemo(() => {
    const nowVn = new Date(Date.now() + 7 * 3_600_000);
    const todayKey = `${nowVn.getUTCFullYear()}-${nowVn.getUTCMonth()}-${nowVn.getUTCDate()}`;
    return Array.from({ length: 7 }, (_, i) => {
      const dayVn = new Date(mondayVnMs + i * 86_400_000 + 7 * 3_600_000);
      const key = `${dayVn.getUTCFullYear()}-${dayVn.getUTCMonth()}-${dayVn.getUTCDate()}`;
      return {
        label: WEEKDAY_VI_LONG[i],
        date: dayVn.getUTCDate(),
        month: dayVn.getUTCMonth() + 1,
        isToday: key === todayKey,
      };
    });
  }, [mondayVnMs]);

  const nowRow = useMemo(() => {
    const nowVn = new Date(Date.now() + 7 * 3_600_000);
    const dow = nowVn.getUTCDay() || 7;
    const todayIdx = dow - 1;
    const currentMondayVnMs =
      Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate() - todayIdx) -
      7 * 3_600_000;
    if (currentMondayVnMs !== mondayVnMs) return null;
    const minutes = nowVn.getUTCHours() * 60 + nowVn.getUTCMinutes();
    return { day: todayIdx, top: (minutes / slotMinutes) * ROW_HEIGHT_PX };
  }, [mondayVnMs, slotMinutes]);

  async function handleCellTap(day: number, slot: number) {
    const cell = grid[day][slot];
    const dayStartMs = mondayVnMs + day * 86_400_000;
    const cellStartMs = dayStartMs + slot * slotMinutes * 60_000;
    const cellEndMs = cellStartMs + slotMinutes * 60_000;

    if (cell.ownerEventIds.length > 0) {
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

    // Empty OR partner-only — create own.
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

  void onChange;

  const hourLabels = useMemo(() => {
    const labels: { row: number; text: string }[] = [];
    for (let h = 0; h < 24; h++) {
      labels.push({ row: (h * 60) / slotMinutes, text: `${h.toString().padStart(2, "0")}:00` });
    }
    return labels;
  }, [slotMinutes]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "white",
        border: "1px solid rgba(255,201,213,0.4)",
        boxShadow: "0 6px 20px rgba(196,102,122,0.08)",
      }}
    >
      {/* Sticky day header strip */}
      <div
        className="grid sticky top-0 z-10"
        style={{
          gridTemplateColumns: `${HOUR_COL_WIDTH_PX}px repeat(7, 1fr)`,
          backgroundColor: "rgba(255,249,245,0.96)",
          backdropFilter: "blur(6px)",
          borderBottom: "1px solid rgba(255,201,213,0.4)",
        }}
      >
        <div />
        {dayHeaders.map((dh, i) => (
          <div
            key={i}
            className="text-center py-2 border-l"
            style={{
              borderColor: "rgba(255,201,213,0.25)",
              backgroundColor: dh.isToday ? "rgba(255,201,213,0.18)" : "transparent",
            }}
          >
            <p className="text-xs font-semibold text-ink-soft">{dh.label}</p>
            <p
              className="text-base font-bold mt-0.5"
              style={{ color: dh.isToday ? "#C4667A" : "#333" }}
            >
              {dh.date}/{dh.month}
            </p>
            {dh.isToday && (
              <p className="text-[10px] uppercase tracking-wide font-bold mt-0.5" style={{ color: "#C4667A" }}>
                Hôm nay
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollerRef} className="relative" style={{ maxHeight: "calc(100dvh - 220px)", overflowY: "auto" }}>
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `${HOUR_COL_WIDTH_PX}px repeat(7, 1fr)`,
            gridAutoRows: `${ROW_HEIGHT_PX}px`,
          }}
        >
          {Array.from({ length: totalSlots }).map((_, row) => {
            const hourLabel = hourLabels.find((h) => h.row === row);
            const isHalfHour = slotMinutes === 30 && row % 2 === 1;
            return (
              <DesktopRow
                key={row}
                row={row}
                hourLabelText={hourLabel && !isHalfHour ? hourLabel.text : ""}
                grid={grid}
                onTap={handleCellTap}
              />
            );
          })}

          {nowRow && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: nowRow.top,
                left: `calc(${HOUR_COL_WIDTH_PX}px + ${nowRow.day} * ((100% - ${HOUR_COL_WIDTH_PX}px) / 7))`,
                width: `calc((100% - ${HOUR_COL_WIDTH_PX}px) / 7)`,
                height: 2,
                backgroundColor: "#E97A95",
                boxShadow: "0 0 6px rgba(233,122,149,0.5)",
                zIndex: 5,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DesktopRow({
  row,
  hourLabelText,
  grid,
  onTap,
}: {
  row: number;
  hourLabelText: string;
  grid: CellState[][];
  onTap: (day: number, slot: number) => void;
}) {
  return (
    <>
      <div
        className="text-xs text-ink-soft text-right pr-2 leading-none flex items-start justify-end pt-1 border-r"
        style={{ borderColor: "rgba(255,201,213,0.25)" }}
      >
        {hourLabelText}
      </div>
      {grid.map((dayCells, day) => {
        const cell = dayCells[row];
        const ownerBusy = cell.ownerEventIds.length > 0;
        const partnerBusy = cell.partnerEventIds.length > 0;
        const isReadonly = !ownerBusy && partnerBusy;
        return (
          <button
            key={day}
            onClick={() => onTap(day, row)}
            className="border-r border-b relative overflow-hidden hover:bg-rose-50/40 transition-colors"
            style={{
              borderColor: "rgba(255,201,213,0.25)",
              backgroundColor: "transparent",
              cursor: isReadonly ? "default" : "pointer",
            }}
            aria-label={ownerBusy || partnerBusy ? "Bận" : "Trống"}
          >
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
