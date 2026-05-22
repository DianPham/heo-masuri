"use client";

/**
 * ReviewRow — a single lesson row on Masuri's review list.
 * Tap → navigate to the detail page.
 * Long-press → bottom action sheet with Publish and Delete (each with confirmation).
 */
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Page {
  id: string;
  title_vi: string;
  topic: string | null;
  scheduled_for: string;
  status: string;
  generated_by: string;
}

const TOPIC_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  daily_life: { bg: "rgba(255,201,213,0.25)", text: "#C4667A",  emoji: "🏠" },
  food:       { bg: "rgba(255,220,150,0.25)", text: "#B8860B",  emoji: "🍜" },
  travel:     { bg: "rgba(173,216,230,0.25)", text: "#1E6F8E",  emoji: "✈️" },
  work:       { bg: "rgba(196,168,220,0.25)", text: "#6B21A8",  emoji: "💼" },
  feelings:   { bg: "rgba(255,182,193,0.25)", text: "#C4667A",  emoji: "💕" },
  nature:     { bg: "rgba(156,175,136,0.25)", text: "#3A6B2A",  emoji: "🌿" },
  cafe:       { bg: "rgba(210,180,140,0.25)", text: "#8B6914",  emoji: "☕" },
  shopping:   { bg: "rgba(255,160,122,0.2)",  text: "#B85C38",  emoji: "🛍️" },
};

function topicStyle(topic: string | null) {
  if (!topic) return { bg: "rgba(200,200,200,0.15)", text: "#888", emoji: "📄" };
  return TOPIC_COLORS[topic] ?? { bg: "rgba(200,200,200,0.15)", text: "#888", emoji: "📄" };
}

function scheduledLabel(dateStr: string) {
  const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const tomorrowVN = new Date(Date.now() + 7 * 3_600_000 + 86_400_000)
    .toISOString()
    .slice(0, 10);

  if (dateStr === todayVN) return { label: "Hôm nay", urgent: true };
  if (dateStr === tomorrowVN) return { label: "Ngày mai", urgent: false };

  const d = new Date(dateStr + "T00:00:00+07:00");
  return {
    label: d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "short" }),
    urgent: false,
  };
}

const LONG_PRESS_MS = 500;

export function ReviewRow({ page }: { page: Page }) {
  const router = useRouter();
  const [showSheet, setShowSheet] = useState(false);
  const [confirm, setConfirm] = useState<"publish" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"published" | "deleted" | null>(null);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  // ── Long-press detection ──────────────────────────────────
  function startPress() {
    didLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if ("vibrate" in navigator) navigator.vibrate(30);
      setShowSheet(true);
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function handleClick() {
    if (didLongPress.current) return;
    router.push(`/masuri/notebook/review/${page.id}`);
  }

  // ── Actions ───────────────────────────────────────────────
  async function doPublish() {
    setBusy(true);
    try {
      const res = await fetch("/api/notebook/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: page.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Lỗi rồi 😢");
        setBusy(false);
        return;
      }
      setDone("published");
      setShowSheet(false);
      setTimeout(() => router.refresh(), 600);
    } catch {
      alert("Mạng đang lỗi, thử lại nha");
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      const res = await fetch("/api/notebook/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: page.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Lỗi rồi 😢");
        setBusy(false);
        return;
      }
      setDone("deleted");
      setShowSheet(false);
      setTimeout(() => router.refresh(), 600);
    } catch {
      alert("Mạng đang lỗi, thử lại nha");
      setBusy(false);
    }
  }

  // ── Done states ───────────────────────────────────────────
  if (done === "deleted") return null;
  if (done === "published") {
    return (
      <div className="flex items-center justify-center py-4 rounded-2xl"
        style={{ backgroundColor: "rgba(240,255,248,0.6)", border: "1px solid rgba(156,175,136,0.3)" }}>
        <span className="text-sm font-semibold text-green-600">✓ Đã phát hành</span>
      </div>
    );
  }

  // ── Row render ────────────────────────────────────────────
  const isDraft = page.status === "draft";
  const { bg, text, emoji } = topicStyle(page.topic);
  const { label: schedLabel, urgent } = scheduledLabel(page.scheduled_for);

  return (
    <>
      <div
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onClick={handleClick}
        className="flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform cursor-pointer select-none"
        style={{
          backgroundColor: isDraft ? "white" : "rgba(240,255,248,0.8)",
          boxShadow: "var(--shadow)",
          border: isDraft
            ? "1.5px solid rgba(255,201,213,0.5)"
            : "1px solid rgba(156,175,136,0.35)",
        }}
      >
        {/* Topic badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
          style={{ backgroundColor: bg }}
        >
          {emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink truncate">{page.title_vi}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: urgent
                  ? "rgba(233,122,149,0.15)"
                  : "rgba(200,200,200,0.15)",
                color: urgent ? "#C4667A" : "#888",
              }}
            >
              {schedLabel}
            </span>
            {page.generated_by === "masuri" && (
              <span className="text-xs text-purple-500">· Masuri viết</span>
            )}
            {page.topic && (
              <span className="text-xs font-medium" style={{ color: text }}>
                {page.topic.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* CTA label */}
        <span
          className="text-xs font-bold shrink-0"
          style={{ color: isDraft ? "#E97A95" : "#3A6B2A" }}
        >
          {isDraft ? "Duyệt →" : "Xem →"}
        </span>
      </div>

      {/* ── Bottom action sheet ── */}
      {showSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => { setShowSheet(false); setConfirm(null); }}
        >
          <div
            className="w-full rounded-t-3xl px-5 pt-6 pb-10"
            style={{ backgroundColor: "#FFF9F5" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-rose-200 mx-auto mb-5" />

            {/* Title */}
            <p className="text-base font-bold text-ink text-center px-4 truncate mb-1">
              {page.title_vi}
            </p>
            <p className="text-xs text-ink-soft text-center mb-6">
              {schedLabel} · {isDraft ? "Chưa duyệt" : "Đã duyệt"}
            </p>

            {/* Confirm publish */}
            {confirm === "publish" ? (
              <div className="space-y-3">
                <p className="text-sm text-center text-ink mb-1">
                  Phát hành ngay bài này cho Heo?
                </p>
                <button
                  onClick={doPublish}
                  disabled={busy}
                  className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-60"
                  style={{ backgroundColor: "#E97A95", boxShadow: "0 4px 14px rgba(209,77,111,0.3)" }}
                >
                  {busy ? "Đang phát hành…" : "✓ Xác nhận phát hành"}
                </button>
                <button
                  onClick={() => setConfirm(null)}
                  className="w-full py-3 text-sm text-ink-soft font-medium"
                >
                  Thôi, quay lại
                </button>
              </div>
            ) : confirm === "delete" ? (
              /* Confirm delete */
              <div className="space-y-3">
                <p className="text-sm text-center text-ink mb-1">
                  Xoá bài này? Không thể khôi phục.
                </p>
                <button
                  onClick={doDelete}
                  disabled={busy}
                  className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-60"
                  style={{ backgroundColor: "#EF4444", boxShadow: "0 4px 14px rgba(239,68,68,0.25)" }}
                >
                  {busy ? "Đang xoá…" : "🗑️ Xác nhận xoá"}
                </button>
                <button
                  onClick={() => setConfirm(null)}
                  className="w-full py-3 text-sm text-ink-soft font-medium"
                >
                  Thôi, quay lại
                </button>
              </div>
            ) : (
              /* Main actions */
              <div className="space-y-3">
                <button
                  onClick={() => setConfirm("publish")}
                  className="w-full py-4 rounded-2xl text-white font-bold text-sm"
                  style={{ backgroundColor: "#E97A95", boxShadow: "0 4px 14px rgba(209,77,111,0.3)" }}
                >
                  🚀 Phát hành ngay
                </button>
                <button
                  onClick={() => setConfirm("delete")}
                  className="w-full py-4 rounded-2xl font-bold text-sm"
                  style={{
                    backgroundColor: "white",
                    border: "1.5px solid rgba(239,68,68,0.3)",
                    color: "#EF4444",
                  }}
                >
                  🗑️ Xoá bài này
                </button>
                <button
                  onClick={() => setShowSheet(false)}
                  className="w-full py-3 text-sm text-ink-soft font-medium"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
