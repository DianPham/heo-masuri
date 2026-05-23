"use client";

/**
 * HeoStudyingBanner — I1
 * Shows on Masuri's dashboard when Heo is actively studying a lesson right now.
 * Listens for "heo:studying" broadcast events on the shared Realtime channel.
 * Auto-hides 5 minutes after the last event (handles tab-close / phone-lock gracefully).
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import type { RealtimeEvent } from "@/components/realtime/RealtimeProvider";

const FADE_AFTER_MS = 5 * 60 * 1000; // 5 minutes of silence → assume Heo left

interface StudyState {
  cardIndex: number;
  total: number;
  pageTitle: string;
}

export function HeoStudyingBanner() {
  const [study, setStudy] = useState<StudyState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listener = useCallback((e: RealtimeEvent) => {
    if (e.event !== "heo:studying") return;
    const { card_index, total, page_title } = e.payload;

    setStudy({ cardIndex: card_index, total, pageTitle: page_title });

    // Reset the auto-hide timer on every new event
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStudy(null), FADE_AFTER_MS);
  }, []);

  useRealtime(listener);

  // Clean up timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!study) return null;

  const cardNum = study.cardIndex + 1; // 0-indexed → 1-indexed for display
  const isNearEnd = cardNum >= study.total - 1;

  return (
    <div
      className="mb-4 rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        background: "linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)",
        border: "1px solid rgba(56,189,248,0.35)",
        boxShadow: "0 2px 10px rgba(56,189,248,0.18)",
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* Pulsing live dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{
            backgroundColor: "#38BDF8",
            animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: "#0EA5E9" }}
        />
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-sky-800">
          Heo đang học ngay bây giờ! 📖
        </p>
        <p className="text-xs text-sky-600 truncate">
          <span className="font-medium">{study.pageTitle}</span>
          {" · "}thẻ {cardNum}/{study.total}
          {isNearEnd && " · gần xong rồi 🌸"}
        </p>
      </div>

      {/* Progress pip row */}
      <div className="flex gap-0.5 shrink-0">
        {Array.from({ length: Math.min(study.total, 10) }).map((_, i) => {
          // If total > 10, collapse proportionally
          const threshold = study.total > 10
            ? Math.round((i / 10) * study.total)
            : i;
          const active = study.cardIndex >= threshold;
          return (
            <span
              key={i}
              className="h-1.5 rounded-full"
              style={{
                width: 6,
                backgroundColor: active ? "#0EA5E9" : "rgba(14,165,233,0.2)",
                transition: "background-color 0.3s",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
