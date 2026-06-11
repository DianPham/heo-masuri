"use client";

/**
 * QuickBlockFAB — bottom-right FAB + sheet for the Quick-block flow.
 * Blueprint §6.4.
 *
 * Pattern: both span AND period are toggleable state. User confirms via the
 * "Chặn" submit button. No auto-submit on period tap (that raced with the
 * user; first tap closed the sheet before they could express their choice).
 *
 * Z-index + safe-area kept from round-2: FAB stays above the bottom nav
 * even with iPhone safe-area insets.
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
  const [period, setPeriod] = useState<Period | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setSpan("today");
    setPeriod(null);
  }

  async function submit() {
    if (!period || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/calendar/quick-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ span, period }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Block failed");
        return;
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
      {/* FAB — z-40 + safe-area-aware bottom offset so the nav never paints over it. */}
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
              Khoảng nào
            </p>
            <div className="space-y-2 mb-5">
              {PERIODS.map((p) => {
                const selected = period === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    disabled={submitting}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
                    style={{
                      backgroundColor: selected ? "rgba(255,201,213,0.65)" : "rgba(250,250,250,0.9)",
                      border: selected
                        ? "1px solid rgba(196,102,122,0.4)"
                        : "1px solid rgba(220,220,220,0.5)",
                    }}
                  >
                    <span
                      className="text-sm font-semibold"
                      style={{ color: selected ? "#C4667A" : "#333" }}
                    >
                      {p.label}
                    </span>
                    <span className="text-xs text-ink-soft">{p.hint}</span>
                  </button>
                );
              })}
            </div>

            {/* Submit + Cancel */}
            <button
              onClick={submit}
              disabled={!period || submitting}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-opacity"
              style={{
                backgroundColor: "#C4667A",
                opacity: !period || submitting ? 0.4 : 1,
                boxShadow: "0 4px 12px rgba(196,102,122,0.3)",
              }}
            >
              {submitting ? "Đang lưu…" : "Chặn"}
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
