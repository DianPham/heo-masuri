"use client";

/**
 * QuickBlockFAB — bottom-right FAB + sheet for the Quick-block flow.
 * Blueprint §6.4.
 *
 * Round-2 polish:
 *  - Higher z-index (z-40) so the bottom nav (z-30) can't paint over it
 *  - Bottom offset includes env(safe-area-inset-bottom) so iPhone safe area
 *    doesn't push the FAB under the nav
 *  - Sheet stays open during submit; closes only on success
 *  - Selected span persists across submissions so "Cả tuần × Cả ngày" works
 *    cleanly in one tap
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
  const [submitting, setSubmitting] = useState<Period | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<{ span: Span; period: Period } | null>(null);

  async function submit(period: Period) {
    if (submitting) return;
    setSubmitting(period);
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
      setLastSubmitted({ span, period });
      onCreated();
      // Auto-close shortly after success so the user sees the confirmation flash.
      setTimeout(() => {
        setOpen(false);
        setLastSubmitted(null);
      }, 800);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Chặn nhanh"
        className="fixed right-5 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center"
        style={{
          // bottom-24 (96px) + safe-area inset. Above the bottom nav (z-30).
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
            onClick={() => !submitting && setOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-5 pb-8 max-w-md mx-auto"
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

            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
              Khoảng nào
            </p>
            <div className="space-y-2">
              {PERIODS.map((p) => {
                const isSubmittingThis = submitting === p.key;
                const isJustSubmitted =
                  lastSubmitted?.span === span && lastSubmitted?.period === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => submit(p.key)}
                    disabled={!!submitting}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-opacity"
                    style={{
                      backgroundColor: isJustSubmitted
                        ? "rgba(168,213,162,0.3)"
                        : "rgba(250,250,250,0.9)",
                      border: isJustSubmitted
                        ? "1px solid rgba(90,175,117,0.5)"
                        : "1px solid rgba(220,220,220,0.5)",
                      opacity: submitting && !isSubmittingThis ? 0.4 : 1,
                    }}
                  >
                    <span className="text-sm font-semibold text-ink">{p.label}</span>
                    <span className="text-xs text-ink-soft">
                      {isSubmittingThis ? "Đang lưu…" : isJustSubmitted ? "✓ Đã lưu" : p.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => !submitting && setOpen(false)}
              disabled={!!submitting}
              className="w-full text-center text-sm text-ink-soft mt-4 py-2 disabled:opacity-50"
            >
              {submitting ? "Đang lưu…" : "Hủy"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
