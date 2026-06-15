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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VisibleEvent } from "@/lib/calendar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { EventDetailSheet, type EventDetailValues } from "./EventDetailSheet";
import { DateSchedulerSheet } from "@/components/dates/DateSchedulerSheet";

export type WeekStar = { day: number; emoji: string; label: string; id: string };

type Props = {
  monday: string;
  events: VisibleEvent[];
  viewerId: string;
  slotMinutes: 30 | 60;
  onChange: () => void;
  stars?: WeekStar[];
};

const WEEKDAY_VI_LONG = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
// Full-size cells for ≥1440px viewports (external monitor); compact cells for
// laptop screens like the 1280-1440px Macbook Pro range where the full size
// felt crowded (per CP10 test-pass feedback).
const ROW_HEIGHT_FULL = 44;
const ROW_HEIGHT_COMPACT = 32;
// Hour column needs enough room for "23:30" at 12px tabular-nums plus right
// padding — 56px is the minimum that doesn't feel cramped on a 1280px MacBook.
const HOUR_COL_WIDTH_FULL = 64;
const HOUR_COL_WIDTH_COMPACT = 56;

function vnDayIndex(iso: string, mondayVnMs: number): number {
  return Math.floor((new Date(iso).getTime() - mondayVnMs) / 86_400_000);
}

type CellState = {
  ownerEventIds: string[];
  partnerEventIds: string[];
  ownerRanges: Array<{ top: number; height: number }>;
  partnerRanges: Array<{ top: number; height: number }>;
};

export function WeekDesktopView({ monday, events, viewerId, slotMinutes, onChange, stars = [] }: Props) {
  const slotsPerDay = 1440 / slotMinutes;
  const totalSlots = slotsPerDay;
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Compact mode kicks in at typical laptop widths.
  const isCompact = useMediaQuery("(max-width: 1440px)");
  const ROW_HEIGHT_PX = isCompact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_FULL;
  const HOUR_COL_WIDTH_PX = isCompact ? HOUR_COL_WIDTH_COMPACT : HOUR_COL_WIDTH_FULL;

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

  // Drag-to-create selection state. {day, startRow, endRow} during a drag; null otherwise.
  const [drag, setDrag] = useState<{ day: number; startRow: number; endRow: number } | null>(null);
  const didDragRef = useRef(false);

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
  const [scheduler, setScheduler] = useState<{ start_at: string; end_at: string } | null>(null);

  type MenuState =
    | { kind: "empty"; x: number; y: number; day: number; row: number }
    | { kind: "own"; x: number; y: number; eventId: string }
    | { kind: "partner-shared"; x: number; y: number; eventId: string };
  const [menu, setMenu] = useState<MenuState | null>(null);
  useEffect(() => {
    if (!menu) return;
    function close() { setMenu(null); }
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  // Anchor scroll to (now - 1h) on current-week paint. The grid no longer has
  // its own inner scroller — find the closest scrolling ancestor (the layout's
  // <main>) and scroll IT to the row's offset from the page top.
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
    const grid = scrollerRef.current;
    if (!grid) return;
    const main = grid.closest("main") as HTMLElement | null;
    const offsetWithinMain = main
      ? grid.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop
      : grid.getBoundingClientRect().top + window.scrollY;
    const target = offsetWithinMain + targetRow * ROW_HEIGHT_PX;
    (main ?? window).scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
  }, [mondayVnMs, slotMinutes, ROW_HEIGHT_PX]);

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
  }, [mondayVnMs, slotMinutes, ROW_HEIGHT_PX]);

  // Global mouseup: if user dragged across 2+ cells, open the create sheet.
  useEffect(() => {
    function onUp() {
      if (drag && didDragRef.current) {
        const { day, startRow, endRow } = drag;
        const lo = Math.min(startRow, endRow);
        const hi = Math.max(startRow, endRow);
        const dayStartMs = mondayVnMs + day * 86_400_000;
        const start_at = new Date(dayStartMs + lo * slotMinutes * 60_000).toISOString();
        const end_at = new Date(dayStartMs + (hi + 1) * slotMinutes * 60_000).toISOString();
        setSheet({ mode: "create", start_at, end_at });
      }
      setDrag(null);
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [drag, mondayVnMs, slotMinutes]);

  const onCellMouseDown = useCallback(
    (day: number, row: number, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      // If the cell already has an own event, let the click fall through to
      // handleCellTap (toggle off) — don't start a drag that would overlap.
      const cell = grid[day]?.[row];
      if (cell && cell.ownerEventIds.length > 0) return;
      setDrag({ day, startRow: row, endRow: row });
      didDragRef.current = false;
    },
    [grid]
  );

  // Hover tooltip — when the cursor enters a cell with own or partner detail,
  // we show a floating reason card. Replaces the right-click "View details"
  // affordance that was inconvenient. Right-click is still kept for own-event
  // edit/delete actions.
  const [hover, setHover] = useState<{ day: number; row: number; x: number; y: number } | null>(null);

  const onCellMouseEnter = useCallback((day: number, row: number, e?: React.MouseEvent) => {
    setDrag((prev) => {
      if (!prev || prev.day !== day) return prev;
      if (row !== prev.endRow) didDragRef.current = true;
      return { day: prev.day, startRow: prev.startRow, endRow: row };
    });
    if (e) {
      setHover({ day, row, x: e.clientX, y: e.clientY });
    } else {
      setHover({ day, row, x: 0, y: 0 });
    }
  }, []);

  const onCellMouseMove = useCallback((day: number, row: number, e: React.MouseEvent) => {
    setHover((prev) => (prev && prev.day === day && prev.row === row ? { day, row, x: e.clientX, y: e.clientY } : prev));
  }, []);

  const onGridMouseLeave = useCallback(() => {
    setHover(null);
  }, []);

  // Resolve the hovered cell into the actual event objects (own + partner) so
  // we can render both reasons in one tooltip when applicable.
  const hoverDetail = useMemo(() => {
    if (!hover) return null;
    const cell = grid[hover.day]?.[hover.row];
    if (!cell) return null;
    const own = cell.ownerEventIds
      .map((id) => optimisticEvents.find((e) => e.id === id))
      .filter((e): e is VisibleEvent => Boolean(e));
    const partner = cell.partnerEventIds
      .map((id) => optimisticEvents.find((e) => e.id === id))
      .filter((e): e is VisibleEvent => Boolean(e));
    const ownWithDetail = own.filter((e) => e.title || e.note || e.emoji);
    const partnerWithDetail = partner.filter((e) => e.title || e.note || e.emoji);
    if (ownWithDetail.length === 0 && partnerWithDetail.length === 0) return null;
    return { own: ownWithDetail, partner: partnerWithDetail };
  }, [hover, grid, optimisticEvents]);

  // Map cell key "day-row" → true if a partner event with shared details
  // STARTS in this cell. Used to render a tiny ⓘ badge so the viewer can
  // discover which blue blocks have title/note info available via right-click.
  // (Partner privacy default is share_details=false; the badge only surfaces
  // when the partner explicitly opted in. Blueprint §6.2.)
  const partnerSharedStartsByCell = useMemo(() => {
    const set = new Set<string>();
    for (const e of optimisticEvents) {
      if (e.is_own) continue;
      if (!e.share_details) continue;
      if (!e.title && !e.note && !e.emoji) continue;
      const eStartMs = new Date(e.start_at).getTime();
      const firstDay = Math.floor((eStartMs - mondayVnMs) / 86_400_000);
      if (firstDay < 0 || firstDay > 6) continue;
      const dayStartMs = mondayVnMs + firstDay * 86_400_000;
      const eStartMin = (eStartMs - dayStartMs) / 60_000;
      const firstRow = Math.max(0, Math.floor(eStartMin / slotMinutes));
      set.add(`${firstDay}-${firstRow}`);
    }
    return set;
  }, [optimisticEvents, mondayVnMs, slotMinutes]);

  // Map cell key "day-row" → list of owner events whose VISUAL BOTTOM edge sits
  // in this cell, along with the in-cell bottom Y fraction (0..1). Used to
  // render a drag-to-resize handle on the last slot of each own event.
  const eventBottomsByCell = useMemo(() => {
    const map = new Map<string, Array<{ eventId: string; bottomY: number }>>();
    for (const e of optimisticEvents) {
      if (!e.is_own) continue;
      const eEnd = new Date(e.end_at).getTime();
      const lastDay = Math.min(6, Math.floor((eEnd - 1 - mondayVnMs) / 86_400_000));
      if (lastDay < 0) continue;
      const dayStartMs = mondayVnMs + lastDay * 86_400_000;
      const eEndMin = (eEnd - dayStartMs) / 60_000;
      const lastRow = Math.min(totalSlots - 1, Math.ceil(eEndMin / slotMinutes) - 1);
      const rowStartMin = lastRow * slotMinutes;
      const bottomY = Math.min(1, (eEndMin - rowStartMin) / slotMinutes);
      const key = `${lastDay}-${lastRow}`;
      const arr = map.get(key) ?? [];
      arr.push({ eventId: e.id, bottomY });
      map.set(key, arr);
    }
    return map;
  }, [optimisticEvents, mondayVnMs, totalSlots, slotMinutes]);

  // Drag-to-resize. Pointer-down on a handle starts a transient drag that
  // updates the event's end_at optimistically and PATCHes on release.
  const resizeRef = useRef<{ eventId: string; origEndAt: string; startY: number } | null>(null);

  const onResizeStart = useCallback(
    (eventId: string, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const event = optimisticEvents.find((ev) => ev.id === eventId);
      if (!event || event.id.startsWith("temp-")) return;
      e.stopPropagation();
      e.preventDefault();
      didDragRef.current = true; // suppress the trailing click on the underlying cell
      resizeRef.current = { eventId, origEndAt: event.end_at, startY: e.clientY };

      function onMove(me: MouseEvent) {
        const r = resizeRef.current;
        if (!r) return;
        const deltaSlots = Math.round((me.clientY - r.startY) / ROW_HEIGHT_PX);
        const origEndMs = new Date(r.origEndAt).getTime();
        const newEndMs = origEndMs + deltaSlots * slotMinutes * 60_000;
        setOptimisticEvents((prev) =>
          prev.map((ev) => {
            if (ev.id !== r.eventId) return ev;
            const startMs = new Date(ev.start_at).getTime();
            // Min duration = 1 slot (strictly less prevents shrinking below).
            if (newEndMs < startMs + slotMinutes * 60_000) return ev;
            return { ...ev, end_at: new Date(newEndMs).toISOString() };
          })
        );
      }
      async function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        const r = resizeRef.current;
        resizeRef.current = null;
        if (!r) return;
        // Read latest end_at via setter callback (avoids stale closure).
        let finalEndAt: string | null = null;
        setOptimisticEvents((prev) => {
          const ev = prev.find((x) => x.id === r.eventId);
          if (ev) finalEndAt = ev.end_at;
          return prev;
        });
        if (!finalEndAt || finalEndAt === r.origEndAt) return;
        try {
          const res = await fetch(`/api/calendar/events/${r.eventId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ end_at: finalEndAt }),
          });
          if (!res.ok) {
            setOptimisticEvents((prev) =>
              prev.map((ev) => (ev.id === r.eventId ? { ...ev, end_at: r.origEndAt } : ev))
            );
          } else {
            const data = await res.json();
            setOptimisticEvents((prev) =>
              prev.map((ev) => (ev.id === r.eventId ? data.event : ev))
            );
          }
        } catch {
          setOptimisticEvents((prev) =>
            prev.map((ev) => (ev.id === r.eventId ? { ...ev, end_at: r.origEndAt } : ev))
          );
        }
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [optimisticEvents, slotMinutes, ROW_HEIGHT_PX]
  );

  const onCellContextMenu = useCallback(
    (day: number, row: number, e: React.MouseEvent) => {
      e.preventDefault();
      const cell = grid[day][row];
      if (cell.ownerEventIds.length > 0) {
        const eventId = cell.ownerEventIds[0];
        if (eventId.startsWith("temp-")) return;
        setMenu({ kind: "own", x: e.clientX, y: e.clientY, eventId });
        return;
      }
      if (cell.partnerEventIds.length > 0) {
        // Show "View details" only if partner shared details.
        const eventId = cell.partnerEventIds[0];
        const ev = optimisticEvents.find((x) => x.id === eventId);
        if (ev && (ev.title || ev.note || ev.emoji)) {
          setMenu({ kind: "partner-shared", x: e.clientX, y: e.clientY, eventId });
        }
        return;
      }
      setMenu({ kind: "empty", x: e.clientX, y: e.clientY, day, row });
    },
    [grid, optimisticEvents]
  );

  // Menu actions
  async function menuQuickBlock(day: number, row: number) {
    setMenu(null);
    const dayStartMs = mondayVnMs + day * 86_400_000;
    const cellStartMs = dayStartMs + row * slotMinutes * 60_000;
    const cellEndMs = cellStartMs + slotMinutes * 60_000;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: VisibleEvent = {
      id: tempId,
      owner: viewerId,
      start_at: new Date(cellStartMs).toISOString(),
      end_at: new Date(cellEndMs).toISOString(),
      source: "manual",
      title: null, note: null, emoji: null, share_details: false,
      is_own: true,
    };
    setOptimisticEvents((prev) => [...prev, optimistic]);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: optimistic.start_at, end_at: optimistic.end_at, source: "manual" }),
      });
      if (res.ok) {
        const data = await res.json();
        setOptimisticEvents((prev) => prev.map((e) => (e.id === tempId ? data.event : e)));
      } else {
        setOptimisticEvents((prev) => prev.filter((e) => e.id !== tempId));
      }
    } catch {
      setOptimisticEvents((prev) => prev.filter((e) => e.id !== tempId));
    }
  }

  function menuNewEvent(day: number, row: number) {
    setMenu(null);
    const dayStartMs = mondayVnMs + day * 86_400_000;
    const start_at = new Date(dayStartMs + row * slotMinutes * 60_000).toISOString();
    const end_at = new Date(dayStartMs + (row + 1) * slotMinutes * 60_000).toISOString();
    setSheet({ mode: "create", start_at, end_at });
  }

  function menuPlanDate(day: number, row: number) {
    setMenu(null);
    const dayStartMs = mondayVnMs + day * 86_400_000;
    const start_at = new Date(dayStartMs + row * slotMinutes * 60_000).toISOString();
    // Default duration: 2 hours.
    const end_at = new Date(new Date(start_at).getTime() + 2 * 3_600_000).toISOString();
    setScheduler({ start_at, end_at });
  }

  function menuEditOwn(eventId: string) {
    setMenu(null);
    const event = optimisticEvents.find((e) => e.id === eventId);
    if (!event) return;
    setSheet({
      mode: "edit",
      id: eventId,
      start_at: event.start_at,
      end_at: event.end_at,
      title: event.title,
      note: event.note,
      emoji: event.emoji,
      share_details: event.share_details,
    });
  }

  async function menuDeleteOwn(eventId: string) {
    setMenu(null);
    if (!confirm("Xóa sự kiện này?")) return;
    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        setOptimisticEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    } catch { /* swallow */ }
  }

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
        if (!res.ok) {
          alert("Lưu thất bại");
          return false;
        }
        const data = await res.json();
        setOptimisticEvents((prev) => [...prev, data.event]);
        return true;
      } catch {
        alert("Lỗi mạng");
        return false;
      }
    } else {
      try {
        const res = await fetch(`/api/calendar/events/${sheet.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          alert("Lưu thất bại");
          return false;
        }
        const data = await res.json();
        setOptimisticEvents((prev) => prev.map((e) => (e.id === sheet.id ? data.event : e)));
        return true;
      } catch {
        alert("Lỗi mạng");
        return false;
      }
    }
  }

  async function handleSheetDelete() {
    if (!sheet || sheet.mode !== "edit") return;
    const id = sheet.id;
    try {
      const res = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setOptimisticEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      // swallow
    }
  }

  async function handleCellTap(day: number, slot: number) {
    // Suppress click that follows a drag.
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
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
            body: JSON.stringify({
              start_at: tmp.start_at,
              end_at: tmp.end_at,
              source: event.source,
              title: event.title,
              note: event.note,
              emoji: event.emoji,
              share_details: event.share_details,
            }),
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
        border: "1px solid var(--color-hairline)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Sticky day header strip — sticks to the page <main> scroll while the
         card body is in view, so the day labels stay column-aligned with the
         grid below and the scrollbar lives on <main> (one scroll, not two). */}
      <div
        className="grid sticky top-0 z-10"
        style={{
          gridTemplateColumns: `${HOUR_COL_WIDTH_PX}px repeat(7, 1fr)`,
          backgroundColor: "rgba(255,249,245,0.96)",
          backdropFilter: "saturate(140%) blur(12px)",
          WebkitBackdropFilter: "saturate(140%) blur(12px)",
          borderBottom: "1px solid var(--color-hairline)",
        }}
      >
        <div />
        {dayHeaders.map((dh, i) => {
          const dayStars = stars.filter((s) => s.day === i);
          return (
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
              <div className="flex items-center justify-center gap-1 mt-0.5 min-h-[14px]">
                {dh.isToday && (
                  <span className="text-[10px] uppercase tracking-wide font-bold" style={{ color: "#C4667A" }}>
                    Hôm nay
                  </span>
                )}
                {dayStars.length > 0 && (
                  <a
                    href="/calendar/important-dates"
                    title={dayStars.map((s) => s.label).join("\n")}
                    className="flex items-center gap-0.5 hover:opacity-80"
                  >
                    {dayStars.map((s) => (
                      <span key={s.id} className="text-sm leading-none" aria-label={s.label}>{s.emoji}</span>
                    ))}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid extends fully — no inner scroll. The page's <main> handles
         scrolling so there's a single scrollbar and the day-header columns
         stay column-aligned with the grid below them. */}
      <div ref={scrollerRef} className="relative" onMouseLeave={onGridMouseLeave}>
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
                drag={drag}
                eventBottomsByCell={eventBottomsByCell}
                partnerSharedStartsByCell={partnerSharedStartsByCell}
                onTap={handleCellTap}
                onCellMouseDown={onCellMouseDown}
                onCellMouseEnter={onCellMouseEnter}
                onCellMouseMove={onCellMouseMove}
                onCellContextMenu={onCellContextMenu}
                onResizeStart={onResizeStart}
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

      {sheet && (
        <EventDetailSheet
          initial={sheet}
          onSave={handleSheetSave}
          onDelete={sheet.mode === "edit" ? handleSheetDelete : undefined}
          onClose={() => setSheet(null)}
        />
      )}

      {scheduler && (
        <DateSchedulerSheet
          defaultStart={scheduler.start_at}
          defaultEnd={scheduler.end_at}
          onClose={() => setScheduler(null)}
          onCreated={() => {
            setScheduler(null);
            onChange();
          }}
        />
      )}

      {/* Hover tooltip — shows own + partner reasons for the hovered cell.
         Replaces the old right-click "View details" menu for partner cells. */}
      {hover && hoverDetail && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: Math.min(hover.x + 14, (typeof window !== "undefined" ? window.innerWidth : 9999) - 280),
            top: Math.min(hover.y + 14, (typeof window !== "undefined" ? window.innerHeight : 9999) - 200),
            maxWidth: 280,
            zIndex: 80,
            background: "#ffffff",
            border: "1px solid var(--color-hairline)",
            borderRadius: 12,
            boxShadow: "var(--shadow-md)",
            padding: "0.5rem 0.75rem",
          }}
        >
          {hoverDetail.own.map((ev, i) => (
            <div key={`o-${ev.id}`} className={i > 0 ? "mt-2" : ""}>
              <p className="section-eyebrow" style={{ color: "var(--color-accent)" }}>Bạn bận</p>
              <ReasonLine ev={ev} />
            </div>
          ))}
          {hoverDetail.partner.map((ev, i) => (
            <div
              key={`p-${ev.id}`}
              className={hoverDetail.own.length > 0 || i > 0 ? "mt-2 pt-2" : ""}
              style={hoverDetail.own.length > 0 && i === 0 ? { borderTop: "1px solid var(--color-hairline)" } : undefined}
            >
              <p className="section-eyebrow" style={{ color: "#3a6da0" }}>Người ấy bận</p>
              <ReasonLine ev={ev} />
            </div>
          ))}
        </div>
      )}

      {menu && (
        <div
          role="menu"
          className="fixed bg-white rounded-xl py-1 text-sm"
          style={{
            left: Math.min(menu.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 200),
            top: Math.min(menu.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 160),
            minWidth: 180,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            border: "1px solid rgba(220,220,220,0.6)",
            zIndex: 90,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {menu.kind === "empty" && (
            <>
              <MenuItem onClick={() => menuQuickBlock(menu.day, menu.row)}>Đánh dấu bận</MenuItem>
              <MenuItem onClick={() => menuNewEvent(menu.day, menu.row)}>Sự kiện mới…</MenuItem>
              <MenuItem onClick={() => menuPlanDate(menu.day, menu.row)}>Lên kế hoạch hẹn 💕</MenuItem>
            </>
          )}
          {menu.kind === "own" && (
            <>
              <MenuItem onClick={() => menuEditOwn(menu.eventId)}>Sửa…</MenuItem>
              <MenuItem onClick={() => menuDeleteOwn(menu.eventId)} danger>Xóa</MenuItem>
            </>
          )}
          {menu.kind === "partner-shared" && (
            <PartnerDetail
              event={optimisticEvents.find((e) => e.id === menu.eventId)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  children,
  danger = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-rose-50 transition-colors"
      style={{ color: danger ? "#C4667A" : "#333" }}
    >
      {children}
    </button>
  );
}

function ReasonLine({ ev }: { ev: VisibleEvent }) {
  return (
    <div className="mt-0.5">
      {(ev.emoji || ev.title) && (
        <p className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
          {ev.emoji && <span className="mr-1">{ev.emoji}</span>}
          {ev.title || "(không tên)"}
        </p>
      )}
      {ev.note && (
        <p className="text-[11.5px] mt-0.5 whitespace-pre-wrap" style={{ color: "var(--color-ink-soft)" }}>
          {ev.note}
        </p>
      )}
    </div>
  );
}

function PartnerDetail({ event }: { event?: VisibleEvent }) {
  if (!event) return null;
  return (
    <div className="px-3 py-2">
      <p className="text-xs font-semibold text-ink-soft mb-1">Người kia bận</p>
      {event.emoji && <p className="text-base">{event.emoji}</p>}
      {event.title && <p className="text-sm text-ink">{event.title}</p>}
      {event.note && <p className="text-xs text-ink-soft mt-1 whitespace-pre-wrap">{event.note}</p>}
    </div>
  );
}

function DesktopRow({
  row,
  hourLabelText,
  grid,
  drag,
  eventBottomsByCell,
  partnerSharedStartsByCell,
  onTap,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseMove,
  onCellContextMenu,
  onResizeStart,
}: {
  row: number;
  hourLabelText: string;
  grid: CellState[][];
  drag: { day: number; startRow: number; endRow: number } | null;
  eventBottomsByCell: Map<string, Array<{ eventId: string; bottomY: number }>>;
  partnerSharedStartsByCell: Set<string>;
  onTap: (day: number, slot: number) => void;
  onCellMouseDown: (day: number, row: number, e: React.MouseEvent) => void;
  onCellMouseEnter: (day: number, row: number, e?: React.MouseEvent) => void;
  onCellMouseMove: (day: number, row: number, e: React.MouseEvent) => void;
  onCellContextMenu: (day: number, row: number, e: React.MouseEvent) => void;
  onResizeStart: (eventId: string, e: React.MouseEvent) => void;
}) {
  return (
    <>
      <div
        className="text-[11.5px] text-right pr-2.5 leading-none flex items-start justify-end pt-1 border-r tabular-nums tracking-tight"
        style={{ borderColor: "var(--color-hairline)", color: "var(--color-ink-mute)" }}
      >
        {hourLabelText}
      </div>
      {grid.map((dayCells, day) => {
        const cell = dayCells[row];
        const ownerBusy = cell.ownerEventIds.length > 0;
        const partnerBusy = cell.partnerEventIds.length > 0;
        const isReadonly = !ownerBusy && partnerBusy;
        const inDrag =
          drag !== null &&
          drag.day === day &&
          row >= Math.min(drag.startRow, drag.endRow) &&
          row <= Math.max(drag.startRow, drag.endRow);
        return (
          <button
            key={day}
            onClick={() => onTap(day, row)}
            onMouseDown={(e) => onCellMouseDown(day, row, e)}
            onMouseEnter={(e) => onCellMouseEnter(day, row, e)}
            onMouseMove={(e) => onCellMouseMove(day, row, e)}
            onContextMenu={(e) => onCellContextMenu(day, row, e)}
            className="group border-r border-b relative overflow-hidden hover:bg-rose-50/40 transition-colors"
            style={{
              borderColor: "rgba(255,201,213,0.25)",
              backgroundColor: "transparent",
              cursor: isReadonly ? "default" : "pointer",
              userSelect: "none",
            }}
            aria-label={ownerBusy || partnerBusy ? "Bận" : "Trống"}
          >
            {inDrag && (
              <span
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: "rgba(196,102,122,0.25)" }}
              />
            )}
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
            {partnerSharedStartsByCell.has(`${day}-${row}`) && (
              <span
                className="absolute top-0.5 right-0.5 pointer-events-none text-[9px] leading-none font-semibold rounded-full px-1 py-0.5"
                style={{
                  color: "#3a6da0",
                  backgroundColor: "rgba(255,255,255,0.85)",
                  zIndex: 2,
                }}
                aria-label="Đối phương đã chia sẻ chi tiết"
              >
                ⓘ
              </span>
            )}
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
            {(eventBottomsByCell.get(`${day}-${row}`) ?? []).map(({ eventId, bottomY }) => (
              <span
                key={`h${eventId}`}
                onMouseDown={(e) => onResizeStart(eventId, e)}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                className="absolute left-2 right-2 hover:bg-rose-500"
                style={{
                  top: `calc(${bottomY * 100}% - 4px)`,
                  height: 6,
                  backgroundColor: "rgba(196,102,122,0.85)",
                  borderRadius: 3,
                  cursor: "ns-resize",
                  zIndex: 3,
                }}
                title="Kéo để mở rộng"
              />
            ))}
          </button>
        );
      })}
    </>
  );
}
