"use client";

/**
 * MasuriGrantRestButton — lets Masuri give Heo an extra rest day.
 * Shows current rest day count, sends push to Heo on grant.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MasuriGrantRestButton({ currentRestDays }: { currentRestDays: number }) {
  const [restDays, setRestDays] = useState(currentRestDays);
  const [loading, setLoading] = useState(false);
  const [justGranted, setJustGranted] = useState(false);
  const router = useRouter();

  async function handleGrant() {
    if (loading || restDays >= 5) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notebook/streak/grant-rest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Có lỗi xảy ra");
        return;
      }
      setRestDays(data.rest_days_remaining);
      setJustGranted(true);
      setTimeout(() => setJustGranted(false), 3000);
      router.refresh();
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const atMax = restDays >= 5;

  return (
    <button
      type="button"
      onClick={handleGrant}
      disabled={loading || atMax}
      className="flex items-center gap-3 p-3 rounded-xl w-full text-left transition-all active:scale-[0.98]"
      style={{
        backgroundColor: atMax ? "transparent" : "rgba(255,240,244,0.8)",
        opacity: atMax ? 0.5 : loading ? 0.7 : 1,
      }}
    >
      <span style={{ fontSize: 20 }}>🌸</span>
      <span className="flex-1 text-sm font-medium text-ink">
        {justGranted
          ? "Đã tặng! Heo sẽ nhận thông báo 💕"
          : atMax
          ? `Heo đang có ${restDays} ngày nghỉ (tối đa)`
          : `Tặng ngày nghỉ cho Heo (đang có ${restDays})`}
      </span>
      {!atMax && !justGranted && (
        <span className="text-rose-400 text-sm font-semibold">+1 →</span>
      )}
    </button>
  );
}
