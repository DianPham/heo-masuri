"use client";

/**
 * UseRestButton — lets Heo declare a planned rest day.
 * Calls POST /api/notebook/streak/use-rest, then refreshes the page.
 * Includes (i) info panel explaining what a rest day is.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export function UseRestButton({ restDays = 1 }: { restDays?: number }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const router = useRouter();

  async function handleRest() {
    if (loading || done) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notebook/streak/use-rest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Có lỗi xảy ra");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="text-xs text-rose-400 font-medium">Nghỉ ngơi nha 🌸</span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {/* Flower count */}
        <div className="flex gap-0.5">
          {[...Array(restDays)].map((_, i) => (
            <span key={i} style={{ fontSize: 13 }}>🌸</span>
          ))}
        </div>

        {/* Info button */}
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          aria-label="Ngày nghỉ là gì?"
          className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold leading-none"
          style={{
            backgroundColor: "rgba(255,201,213,0.5)",
            color: "#C4667A",
            border: "1px solid rgba(196,102,122,0.3)",
          }}
        >
          i
        </button>

        {/* Rest button */}
        <button
          type="button"
          onClick={handleRest}
          disabled={loading}
          className="text-xs font-medium px-2.5 py-1 rounded-xl transition-opacity"
          style={{
            backgroundColor: "rgba(255,201,213,0.4)",
            color: "#C4667A",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "..." : "Heo nghỉ"}
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div
          className="text-xs text-ink-soft leading-relaxed rounded-xl px-3 py-2 max-w-[220px] text-right"
          style={{
            backgroundColor: "rgba(255,240,244,0.95)",
            border: "1px solid rgba(255,201,213,0.5)",
          }}
        >
          <p className="font-semibold text-rose-400 mb-0.5">Ngày nghỉ là gì? 🌸</p>
          <p>
            Hôm nay bận hoặc mệt? Bấm đây để dùng một ngày nghỉ — streak của Heo sẽ
            được giữ nguyên đến ngày mai mà không cần học hôm nay.
          </p>
          <p className="mt-1 opacity-70">
            Ngày nghỉ được bổ sung mỗi tuần (tối đa 2).
          </p>
        </div>
      )}
    </div>
  );
}
