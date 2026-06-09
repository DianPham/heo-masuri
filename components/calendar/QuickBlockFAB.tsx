"use client";

/**
 * QuickBlockFAB — bottom-right FAB + sheet for the Quick-block flow.
 * Blueprint §6.4.
 *
 * Tap FAB → bottom sheet with [span × period] options. Tap any pair → fire
 * POST /api/calendar/quick-block and dismiss.
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
  const [submitting, setSubmitting] = useState(false);

  async function submit(period: Period) {
    if (submitting) return;
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
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Chặn nhanh"
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center"
        style={{
          backgroundColor: "#C4667A",
          boxShadow: "0 4px 18px rgba(196,102,122,0.45)",
        }}
      >
        +
      </button>

      {/* Sheet */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-8 max-w-md mx-auto"
            style={{ backgroundColor: "white", boxShadow: "0 -8px 30px rgba(0,0,0,0.15)" }}
          >
            <div className="w-12 h-1.5 rounded-full bg-rose-100 mx-auto mb-4" />
            <h2 className="text-base font-bold text-ink mb-3">Chặn nhanh</h2>

            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">Khi nào</p>
            <div className="flex gap-2 mb-4">
              {SPANS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSpan(s.key)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: span === s.key ? "rgba(255,201,213,0.7)" : "rgba(245,245,245,0.8)",
                    color: span === s.key ? "#C4667A" : "#666",
                    border: span === s.key ? "1px solid rgba(196,102,122,0.4)" : "1px solid transparent",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">Khoảng nào</p>
            <div className="space-y-2">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => submit(p.key)}
                  disabled={submitting}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-opacity"
                  style={{
                    backgroundColor: "rgba(250,250,250,0.9)",
                    border: "1px solid rgba(220,220,220,0.5)",
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  <span className="text-sm font-semibold text-ink">{p.label}</span>
                  <span className="text-xs text-ink-soft">{p.hint}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="w-full text-center text-sm text-ink-soft mt-4 py-2"
            >
              Hủy
            </button>
          </div>
        </>
      )}
    </>
  );
}
