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
        className="fixed right-5 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center transition-all active:scale-95 hover:translate-y-[-1px]"
        style={{
          bottom: "calc(6rem + env(safe-area-inset-bottom))",
          zIndex: 40,
          background: "var(--color-accent)",
          boxShadow: "0 8px 24px -4px rgba(177,73,99,0.42), 0 2px 4px rgba(58,33,41,0.08)",
        }}
      >
        +
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 45, background: "rgba(20,10,14,0.45)", backdropFilter: "blur(2px)" }}
            onClick={closeSheet}
          />
          <div
            className="fixed bottom-0 left-0 right-0 rounded-t-3xl px-6 pt-5 max-w-md mx-auto"
            style={{
              zIndex: 50,
              background: "#ffffff",
              boxShadow: "var(--shadow-lg)",
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: "rgba(58,33,41,0.12)" }}
            />
            <p className="section-eyebrow mb-1.5">Chặn nhanh</p>
            <h2
              className="font-medium tracking-tight mb-4"
              style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-ink)" }}
            >
              Khoá vài khung giờ
            </h2>

            <p className="field-label">Khi nào</p>
            <div className="flex gap-1.5 mb-4">
              {SPANS.map((s) => {
                const selected = span === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSpan(s.key)}
                    disabled={submitting}
                    className={`chip flex-1 justify-center py-2 ${selected ? "chip-active" : ""}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <p className="field-label">
              Khoảng nào <span className="opacity-70 normal-case font-normal">· chọn nhiều được</span>
            </p>
            <div className="space-y-1.5 mb-5">
              {PERIODS.map((p) => {
                const selected = periods.has(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePeriod(p.key)}
                    disabled={submitting}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: selected ? "var(--color-accent-tint)" : "transparent",
                      border: selected
                        ? "1px solid var(--color-accent-soft)"
                        : "1px solid var(--color-hairline)",
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className="inline-block w-4 h-4 rounded flex items-center justify-center transition-colors"
                        style={{
                          background: selected ? "var(--color-accent)" : "#ffffff",
                          border: selected ? "1px solid var(--color-accent)" : "1px solid var(--color-hairline-strong)",
                        }}
                      >
                        {selected && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5 L4 7 L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span
                        className="text-[13.5px] font-medium"
                        style={{ color: selected ? "var(--color-accent)" : "var(--color-ink)" }}
                      >
                        {p.label}
                      </span>
                    </span>
                    <span className="text-[11.5px]" style={{ color: "var(--color-ink-mute)" }}>
                      {p.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={submit}
              disabled={periods.size === 0 || submitting}
              className="btn-primary w-full py-3"
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
              className="w-full text-center text-[12px] mt-2 py-2 disabled:opacity-50"
              style={{ color: "var(--color-ink-mute)" }}
            >
              Hủy
            </button>
          </div>
        </>
      )}
    </>
  );
}
