"use client";

/**
 * PublishButton — Masuri manually publishes a queued lesson immediately.
 * Appears on draft/approved pages in the review list.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishButton({ pageId, title }: { pageId: string; title: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirming" | "publishing" | "done">("idle");

  async function publish() {
    setState("publishing");
    try {
      const res = await fetch("/api/notebook/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Lỗi rồi 😢");
        setState("confirming");
        return;
      }
      setState("done");
      setTimeout(() => { router.refresh(); }, 800);
    } catch {
      alert("Mạng đang lỗi, thử lại nha");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <span className="text-xs font-bold text-green-600 shrink-0">
        Đã phát hành ✓
      </span>
    );
  }

  if (state === "confirming") {
    return (
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
        <button
          onClick={() => setState("idle")}
          className="text-xs text-ink-soft px-2 py-1 rounded-lg border border-rose-100"
        >
          Thôi
        </button>
        <button
          onClick={publish}
          className="text-xs font-bold text-white bg-rose-500 px-3 py-1 rounded-lg"
          style={{ boxShadow: "0 2px 8px rgba(209,77,111,0.3)" }}
        >
          Phát hành
        </button>
      </div>
    );
  }

  if (state === "publishing") {
    return <span className="text-xs text-rose-300 shrink-0">Đang phát hành…</span>;
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); setState("confirming"); }}
      className="text-xs font-bold text-white bg-rose-400 px-3 py-1.5 rounded-xl shrink-0 active:scale-95 transition-transform"
      style={{ boxShadow: "0 2px 8px rgba(209,77,111,0.25)" }}
      title={`Phát hành ngay: ${title}`}
    >
      Phát hành
    </button>
  );
}
