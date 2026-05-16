"use client";

/**
 * UseRestButton — lets Heo declare a planned rest day.
 * Calls POST /api/notebook/streak/use-rest, then refreshes the page.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export function UseRestButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
      // Refresh server data so rest day count updates
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
      {loading ? "..." : "Heo nghỉ 🌸"}
    </button>
  );
}
