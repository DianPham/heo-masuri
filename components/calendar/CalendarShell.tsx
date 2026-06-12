"use client";

/**
 * CalendarShell — top-level client wrapper for the mobile calendar.
 * Blueprint §6.3, §6.4. Renders the header (week nav + granularity selector),
 * one of the per-granularity views, and the quick-block FAB.
 *
 * CP3 ships hour, 30-min, and block granularities — mobile only. CP4 will
 * add the desktop layout under `md:`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
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

  // Persist granularity
  useEffect(() => {
    localStorage.setItem(STORAGE_GRANULARITY, granularity);
  }, [granularity]);

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
      if ((e.metaKey || e.ctrlKey) && (e.key === "n" || e.key === "N")) {
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

  return (
    <div className="min-h-dvh lg:px-6 lg:py-4">
      {/* Header */}
      <header
        className="px-4 pt-6 pb-3 sticky top-0 z-20 lg:px-0 lg:pt-2 lg:pb-3 lg:static"
        style={{ backgroundColor: "rgba(255,249,245,0.94)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-2 mb-3 lg:max-w-screen-2xl lg:mx-auto">
          <button onClick={goPrev} className="w-9 h-9 rounded-full flex items-center justify-center text-rose-400 active:bg-rose-100" aria-label="Tuần trước">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14 L5 9 L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold text-ink leading-tight" style={{ fontFamily: "var(--font-handwritten)" }}>
              {weekLabel}
            </h1>
            {!isCurrentWeek && (
              <button onClick={goToday} className="text-xs text-purple-500 underline underline-offset-2">
                Về tuần này
              </button>
            )}
          </div>
          <button onClick={goNext} className="w-9 h-9 rounded-full flex items-center justify-center text-rose-400 active:bg-rose-100" aria-label="Tuần sau">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 4 L13 9 L7 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {isDesktop && (
            <button
              onClick={openNewEventSheet}
              className="hidden lg:inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "#C4667A",
                boxShadow: "0 4px 12px rgba(196,102,122,0.3)",
              }}
              title="Sự kiện mới (⌘N)"
            >
              <span aria-hidden>+</span>
              <span>Sự kiện mới</span>
            </button>
          )}
        </div>

        {who === "masuri" && (
          <a
            href="/masuri/calendar/template"
            className="block text-center text-xs text-rose-400 underline underline-offset-2 mb-2"
          >
            Lịch lặp hàng tuần ↗
          </a>
        )}
        <div className="flex justify-center gap-3 mb-2">
          <a href="/calendar/important-dates" className="text-xs text-rose-400 underline underline-offset-2">
            Ngày quan trọng ↗
          </a>
          <a href="/dates/ideas" className="text-xs text-rose-400 underline underline-offset-2">
            Ý tưởng hẹn ↗
          </a>
        </div>

        {/* Stars strip — important_date occurrences in the displayed week (§6.8). */}
        {initialStars.length > 0 && (
          <div
            className="grid mb-2 px-1"
            style={{ gridTemplateColumns: `repeat(7, 1fr)`, gap: 4 }}
          >
            {Array.from({ length: 7 }, (_, day) => {
              const today = initialStars.filter((s) => s.day === day);
              if (today.length === 0) return <div key={day} />;
              return (
                <a
                  key={day}
                  href="/calendar/important-dates"
                  className="flex flex-col items-center text-center hover:opacity-80"
                  title={today.map((s) => s.label).join("\n")}
                >
                  <span className="text-base leading-none">{today.map((s) => s.emoji).join("")}</span>
                  <span className="text-[9px] text-ink-soft mt-0.5 truncate w-full">
                    {today[0].label}
                  </span>
                </a>
              );
            })}
          </div>
        )}

        {/* Granularity selector */}
        <div className="flex rounded-2xl overflow-hidden text-xs font-medium" style={{ border: "1px solid rgba(255,201,213,0.5)" }}>
          {(["hour", "halfhour", "block"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className="flex-1 py-1.5 transition-colors"
              style={{
                backgroundColor: granularity === g ? "rgba(255,201,213,0.6)" : "transparent",
                color: granularity === g ? "#C4667A" : "#888",
              }}
            >
              {g === "hour" ? "1 giờ" : g === "halfhour" ? "30 phút" : "Buổi"}
            </button>
          ))}
        </div>

        {/* Fixed-height loading slot so toggling on/off doesn't shift content below. */}
        <p
          className="text-xs text-ink-soft text-center mt-2"
          style={{
            visibility: loading ? "visible" : "hidden",
            opacity: 0.7,
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
          />
        ) : granularity === "block" ? (
          <WeekBlockView
            monday={monday}
            events={events}
            viewerId={viewerId}
            onChange={() => reload(monday)}
          />
        ) : (
          <WeekHourView
            monday={monday}
            events={events}
            viewerId={viewerId}
            slotMinutes={granularity === "halfhour" ? 30 : 60}
            onChange={() => reload(monday)}
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
