"use client";

/**
 * QuickBlockFAB — bottom-right FAB + sheet for the Quick-block flow.
 * Blueprint §6.4.
 *
 * Pattern: span is single-select. Periods are multi-select — pick any
 * combination (e.g. Sáng + Chiều, or Sáng + Tối) and one Chặn tap creates
 * all of them as separate events. "Cả ngày" is mutually exclusive with the
 * other periods (selecting it clears the rest; selecting another period
 * clears Cả ngày).
 */
import { useState } from "react";

type Span = "today" | "tomorrow" | "this_week";
type Period = "morning" | "afternoon" | "evening" | "late" | "all_day";

const SPANS: { key: Span; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "tomorrow", label: "Ngày mai" },
  { key: "this_week", label: "Cả tuần" },
];

const PERIODS: { key: Period; label: string; hint: string }[] = [
  { key: "morning",   label: "Sáng",      hint: "8 – 12" },
  { key: "afternoon", label: "Chiều",     hint: "12 – 17" },
  { key: "evening",   label: "Tối",       hint: "17 – 21" },
  { key: "late",      label: "Đêm khuya", hint: "21 – 24" },
  { key: "all_day",   label: "Cả ngày",   hint: "8 – 24" },
];

export function QuickBlockFAB({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [span, setSpan] = useState<Span>("today");
  const [periods, setPeriods] = useState<Set<Period>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  function togglePeriod(p: Period) {
    setPeriods((prev) => {
      const next = new Set(prev);
      if (p === "all_day") {
        // Cả ngày is mutually exclusive with the other periods
        if (next.has("all_day")) next.delete("all_day");
        else {
          next.clear();
          next.add("all_day");
        }
      } else {
        // Adding a non-all_day period clears all_day
        next.delete("all_day");
        if (next.has(p)) next.delete(p);
        else next.add(p);
      }
      return next;
    });
  }

  function reset() {
    setSpan("today");
    setPeriods(new Set());
  }

  async function submit() {
    if (periods.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      // Fire one POST per selected period. Parallel — they don't interact.
      const results = await Promise.all(
        Array.from(periods).map((p) =>
          fetch("/api/calendar/quick-block", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ span, period: p }),
          }).then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => ({})) }))
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        alert(failed[0].body?.error ?? "Some blocks failed");
        // Still call onCreated for the ones that succeeded
      }
      onCreated();
      setOpen(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  function closeSheet() {
    if (submitting) return;
    setOpen(false);
    reset();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Chặn nhanh"
        className="fixed right-5 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center"
        style={{
          bottom: "calc(6rem + env(safe-area-inset-bottom))",
          zIndex: 40,
          backgroundColor: "#C4667A",
          boxShadow: "0 4px 18px rgba(196,102,122,0.45)",
        }}
      >
        +
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/30"
            style={{ zIndex: 45 }}
            onClick={closeSheet}
          />
          <div
            className="fixed bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-5 max-w-md mx-auto"
            style={{
              zIndex: 50,
              backgroundColor: "white",
              boxShadow: "0 -8px 30px rgba(0,0,0,0.15)",
              paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="w-12 h-1.5 rounded-full bg-rose-100 mx-auto mb-4" />
            <h2 className="text-base font-bold text-ink mb-3">Chặn nhanh</h2>

            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
              Khi nào
            </p>
            <div className="flex gap-2 mb-4">
              {SPANS.map((s) => {
                const selected = span === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSpan(s.key)}
                    disabled={submitting}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: selected ? "rgba(255,201,213,0.7)" : "rgba(245,245,245,0.8)",
                      color: selected ? "#C4667A" : "#666",
                      border: selected ? "1px solid rgba(196,102,122,0.4)" : "1px solid transparent",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
              Khoảng nào <span className="opacity-70 normal-case font-normal">(chọn nhiều được)</span>
            </p>
            <div className="space-y-2 mb-5">
              {PERIODS.map((p) => {
                const selected = periods.has(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePeriod(p.key)}
                    disabled={submitting}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
                    style={{
                      backgroundColor: selected ? "rgba(255,201,213,0.65)" : "rgba(250,250,250,0.9)",
                      border: selected
                        ? "1px solid rgba(196,102,122,0.4)"
                        : "1px solid rgba(220,220,220,0.5)",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-4 h-4 rounded border flex items-center justify-center"
                        style={{
                          borderColor: selected ? "#C4667A" : "rgba(200,200,200,0.8)",
                          backgroundColor: selected ? "#C4667A" : "white",
                        }}
                      >
                        {selected && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5 L4 7 L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: selected ? "#C4667A" : "#333" }}
                      >
                        {p.label}
                      </span>
                    </span>
                    <span className="text-xs text-ink-soft">{p.hint}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={submit}
              disabled={periods.size === 0 || submitting}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-opacity"
              style={{
                backgroundColor: "#C4667A",
                opacity: periods.size === 0 || submitting ? 0.4 : 1,
                boxShadow: "0 4px 12px rgba(196,102,122,0.3)",
              }}
            >
              {submitting
                ? "Đang lưu…"
                : periods.size === 0
                ? "Chặn"
                : `Chặn ${periods.size} khoảng`}
            </button>
            <button
              onClick={closeSheet}
              disabled={submitting}
              className="w-full text-center text-sm text-ink-soft mt-2 py-2 disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
        </>
      )}
    </>
  );
}
