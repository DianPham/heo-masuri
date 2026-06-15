"use client";

/**
 * CalendarShell — top-level client wrapper for the mobile calendar.
 * Blueprint §6.3, §6.4. Renders the header (week nav + granularity selector),
 * one of the per-granularity views, and the quick-block FAB.
 *
 * CP3 ships hour, 30-min, and block granularities — mobile only. CP4 will
 * add the desktop layout under `md:`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WeekHourView } from "./WeekHourView";
import { WeekBlockView } from "./WeekBlockView";
import { WeekDesktopView } from "./WeekDesktopView";
import { QuickBlockFAB } from "./QuickBlockFAB";
import { EventDetailSheet, type EventDetailValues } from "./EventDetailSheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { VisibleEvent } from "@/lib/calendar";

export type Granularity = "hour" | "halfhour" | "block";

export type WeekStar = { day: number; emoji: string; label: string; id: string };

type Props = {
  initialMonday: string;       // YYYY-MM-DD in VN
  initialEvents: VisibleEvent[];
  initialStars?: WeekStar[];
  viewerId: string;
  /** Soft-gate identity — drives Masuri-only links like "Lịch lặp". */
  who?: "heo" | "masuri" | "";
};

const STORAGE_GRANULARITY = "calendar.granularity";

function addDaysVN(mondayStr: string, days: number): string {
  const ms = Date.UTC(
    Number(mondayStr.slice(0, 4)),
    Number(mondayStr.slice(5, 7)) - 1,
    Number(mondayStr.slice(8, 10))
  );
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

function thisWeekMondayVN(): string {
  const nowVn = new Date(Date.now() + 7 * 3_600_000);
  const dow = nowVn.getUTCDay() || 7;
  const m = new Date(nowVn);
  m.setUTCDate(nowVn.getUTCDate() - (dow - 1));
  return m.toISOString().slice(0, 10);
}

function formatWeekLabel(mondayStr: string): string {
  const startMs = Date.UTC(
    Number(mondayStr.slice(0, 4)),
    Number(mondayStr.slice(5, 7)) - 1,
    Number(mondayStr.slice(8, 10))
  );
  const start = new Date(startMs);
  const end = new Date(startMs + 6 * 86_400_000);
  const startLabel = start.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
  const endLabel = end.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
  return `${startLabel} – ${endLabel}`;
}

export function CalendarShell({ initialMonday, initialEvents, initialStars = [], viewerId, who }: Props) {
  const [monday, setMonday] = useState(initialMonday);
  const [events, setEvents] = useState<VisibleEvent[]>(initialEvents);
  const [granularity, setGranularity] = useState<Granularity>("hour");
  const [loading, setLoading] = useState(false);
  const [shellSheet, setShellSheet] = useState<
    { mode: "create"; start_at: string; end_at: string } | null
  >(null);

  // Restore granularity from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_GRANULARITY) as Granularity | null;
    if (saved === "hour" || saved === "halfhour" || saved === "block") {
      setGranularity(saved);
    }
  }, []);

  // Fetch events when week changes
  const reload = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const fromMs = Date.UTC(
        Number(m.slice(0, 4)),
        Number(m.slice(5, 7)) - 1,
        Number(m.slice(8, 10))
      ) - 7 * 3_600_000; // Mon 00:00 VN = UTC-7
      const fromIso = new Date(fromMs).toISOString();
      const toIso = new Date(fromMs + 7 * 86_400_000).toISOString();
      const res = await fetch(
        `/api/calendar/events?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // When monday changes (and isn't the initial value), refetch
  useEffect(() => {
    if (monday !== initialMonday) reload(monday);
  }, [monday, initialMonday, reload]);

  // Persist granularity + refetch on swap so the new view doesn't render with
  // stale shell state. Each child view holds an optimistic copy of `events`
  // for its own local mutations; swapping views remounts that copy from the
  // shell prop, so any add/delete made inside the previous view would disappear
  // until the next manual reload. Reloading here keeps the swap seamless.
  const didMountGranularityRef = useRef(false);
  useEffect(() => {
    localStorage.setItem(STORAGE_GRANULARITY, granularity);
    if (!didMountGranularityRef.current) {
      didMountGranularityRef.current = true;
      return;
    }
    reload(monday);
  }, [granularity, monday, reload]);

  function goPrev() {
    setMonday((m) => addDaysVN(m, -7));
  }
  function goNext() {
    setMonday((m) => addDaysVN(m, 7));
  }
  function goToday() {
    setMonday(thisWeekMondayVN());
  }

  const weekLabel = useMemo(() => formatWeekLabel(monday), [monday]);
  const isCurrentWeek = monday === thisWeekMondayVN();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Open "new event" sheet with a sensible default time slot:
  //   - current week → next-rounded-hour today, 1h
  //   - other weeks → monday 09:00, 1h
  const openNewEventSheet = useCallback(() => {
    const mondayMsUtc = Date.UTC(
      Number(monday.slice(0, 4)),
      Number(monday.slice(5, 7)) - 1,
      Number(monday.slice(8, 10))
    );
    const mondayVnMs = mondayMsUtc - 7 * 3_600_000;
    let startMs: number;
    if (monday === thisWeekMondayVN()) {
      const nowVn = new Date(Date.now() + 7 * 3_600_000);
      const dow = (nowVn.getUTCDay() || 7) - 1;
      const nextHour = nowVn.getUTCHours() + 1;
      const todayStartVnMs = mondayVnMs + dow * 86_400_000;
      startMs = todayStartVnMs + Math.min(23, nextHour) * 3_600_000;
    } else {
      startMs = mondayVnMs + 9 * 3_600_000;
    }
    setShellSheet({
      mode: "create",
      start_at: new Date(startMs).toISOString(),
      end_at: new Date(startMs + 3_600_000).toISOString(),
    });
  }, [monday]);

  async function handleShellSave(values: EventDetailValues): Promise<boolean> {
    if (!shellSheet) return false;
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: shellSheet.start_at,
          end_at: shellSheet.end_at,
          source: "manual",
          ...values,
        }),
      });
      if (!res.ok) { alert("Lưu thất bại"); return false; }
      await reload(monday);
      return true;
    } catch { alert("Lỗi mạng"); return false; }
  }

  // Keyboard navigation (§6.5). Bound at the shell so the same shortcuts work
  // for either layout. Skips when the focus is inside an input/textarea so
  // typing a Vietnamese letter "t" inside a future event-detail textarea
  // doesn't fire goToday().
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      // Cmd/Ctrl + E for "new event" — Cmd+N is OS-reserved (open new window)
      // and the browser eats it before preventDefault runs.
      if ((e.metaKey || e.ctrlKey) && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        openNewEventSheet();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        goToday();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNewEventSheet]);

  // Expose the sticky shell-header height as a CSS var so the day-header strip
  // inside WeekHourView can stick *below* it instead of overlapping. Only
  // matters on mobile (the desktop shell is `lg:static` so the day header can
  // sit at top:0 with no header above it).
  const shellHeaderRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = shellHeaderRef.current;
    if (!el) return;
    const update = () => {
      document.documentElement.style.setProperty("--calendar-shell-h", `${el.offsetHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--calendar-shell-h");
    };
  }, []);

  return (
    <div className="min-h-dvh lg:px-6 lg:py-4">
      {/* Header */}
      <header
        ref={shellHeaderRef}
        className="px-4 pt-5 pb-3 sticky top-0 z-20 lg:px-0 lg:pt-2 lg:pb-3 lg:static"
        style={{
          background: "rgba(255, 249, 245, 0.88)",
          backdropFilter: "saturate(140%) blur(20px)",
          WebkitBackdropFilter: "saturate(140%) blur(20px)",
          borderBottom: "1px solid var(--color-hairline)",
        }}
      >
        <div className="flex items-center gap-2 mb-3 lg:max-w-screen-2xl lg:mx-auto">
          <button
            onClick={goPrev}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[rgba(58,33,41,0.05)] active:scale-95"
            style={{ color: "var(--color-ink-soft)" }}
            aria-label="Tuần trước"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M11 14 L5 9 L11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <h1
              className="font-medium tracking-tight"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--color-ink)", lineHeight: 1.15 }}
            >
              {weekLabel}
            </h1>
            {!isCurrentWeek && (
              <button
                onClick={goToday}
                className="text-[11px] mt-0.5 transition-colors"
                style={{ color: "var(--color-accent)" }}
              >
                Về tuần này
              </button>
            )}
          </div>
          <button
            onClick={goNext}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[rgba(58,33,41,0.05)] active:scale-95"
            style={{ color: "var(--color-ink-soft)" }}
            aria-label="Tuần sau"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M7 4 L13 9 L7 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {isDesktop && (
            <button
              onClick={openNewEventSheet}
              className="btn-primary hidden lg:inline-flex ml-2"
              style={{ padding: "0.4375rem 0.875rem", fontSize: "0.8125rem" }}
              title="Sự kiện mới (⌘E)"
            >
              <span aria-hidden>+</span>
              <span>Sự kiện mới</span>
            </button>
          )}
        </div>

        <div className="flex justify-center items-center gap-4 mb-3 text-[11.5px]">
          {who === "masuri" && (
            <a
              href="/masuri/calendar/template"
              className="transition-colors hover:underline"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Lịch lặp hàng tuần
            </a>
          )}
          <a
            href="/calendar/important-dates"
            className="transition-colors hover:underline"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Ngày đặc biệt
          </a>
          <a
            href="/dates/ideas"
            className="transition-colors hover:underline"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Ý tưởng hẹn
          </a>
        </div>

        {/* Granularity selector */}
        <div
          className="flex rounded-full overflow-hidden text-[11.5px] font-medium p-0.5"
          style={{ background: "rgba(58,33,41,0.05)" }}
        >
          {(["hour", "halfhour", "block"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className="flex-1 py-1.5 rounded-full transition-all"
              style={{
                background: granularity === g ? "#ffffff" : "transparent",
                color: granularity === g ? "var(--color-accent)" : "var(--color-ink-mute)",
                boxShadow: granularity === g ? "var(--shadow-sm)" : "none",
              }}
            >
              {g === "hour" ? "1 giờ" : g === "halfhour" ? "30 phút" : "Buổi"}
            </button>
          ))}
        </div>

        <p
          className="text-[11px] text-center mt-2"
          style={{
            color: "var(--color-ink-mute)",
            visibility: loading ? "visible" : "hidden",
            height: "1em",
            lineHeight: "1em",
          }}
        >
          Đang tải…
        </p>
      </header>

      {/* View — desktop horizontal grid (§6.5) when viewport ≥ 1024px,
         otherwise the existing mobile views per §6.3. Granularity tabs only
         apply to the time grids (hour/30-min); block view is mobile-only. */}
      <div className="lg:max-w-screen-2xl lg:mx-auto">
        {isDesktop && granularity !== "block" ? (
          <WeekDesktopView
            monday={monday}
            events={events}
            viewerId={viewerId}
            slotMinutes={granularity === "halfhour" ? 30 : 60}
            onChange={() => reload(monday)}
            stars={initialStars}
          />
        ) : granularity === "block" ? (
          <WeekBlockView
            monday={monday}
            events={events}
            viewerId={viewerId}
            onChange={() => reload(monday)}
            stars={initialStars}
          />
        ) : (
          <WeekHourView
            monday={monday}
            events={events}
            viewerId={viewerId}
            slotMinutes={granularity === "halfhour" ? 30 : 60}
            onChange={() => reload(monday)}
            stars={initialStars}
          />
        )}
      </div>

      <QuickBlockFAB onCreated={() => reload(monday)} />

      {shellSheet && (
        <EventDetailSheet
          initial={shellSheet}
          onSave={handleShellSave}
          onClose={() => setShellSheet(null)}
        />
      )}
    </div>
  );
}
