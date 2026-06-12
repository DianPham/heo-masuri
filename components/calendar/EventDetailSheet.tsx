"use client";

/**
 * EventDetailSheet — modal/sheet for creating or editing a calendar event.
 * Blueprint §6.4 (mobile detail sheet) + §6.5 (desktop inline popover).
 *
 * Renders as a bottom sheet on mobile and a centered modal on desktop (same
 * component, different positioning via Tailwind responsive classes).
 *
 * Fields: title, note, emoji, share_details toggle, time range (read-only).
 * Buttons: Save, Cancel, and Delete (edit mode only).
 *
 * Esc closes the sheet (saves the user from explicit Cancel taps).
 */
import { useEffect, useRef, useState } from "react";

type CreateInitial = {
  mode: "create";
  start_at: string;
  end_at: string;
  source?: string;
};

type EditInitial = {
  mode: "edit";
  id: string;
  start_at: string;
  end_at: string;
  title: string | null;
  note: string | null;
  emoji: string | null;
  share_details: boolean;
};

export type EventDetailValues = {
  title: string | null;
  note: string | null;
  emoji: string | null;
  share_details: boolean;
};

type Props = {
  initial: CreateInitial | EditInitial;
  /**
   * Persist. Return true on success → sheet closes; false → sheet stays open
   * (the caller has already alerted the user).
   */
  onSave: (values: EventDetailValues) => Promise<boolean>;
  /** Only present in edit mode. */
  onDelete?: () => Promise<void>;
  onClose: () => void;
};

function formatTimeVN(iso: string): string {
  const vn = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return `${String(vn.getUTCHours()).padStart(2, "0")}:${String(vn.getUTCMinutes()).padStart(2, "0")}`;
}

function formatDayVN(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export function EventDetailSheet({ initial, onSave, onDelete, onClose }: Props) {
  const editMode = initial.mode === "edit";
  const [title, setTitle] = useState(editMode ? (initial.title ?? "") : "");
  const [note, setNote] = useState(editMode ? (initial.note ?? "") : "");
  const [emoji, setEmoji] = useState(editMode ? (initial.emoji ?? "") : "");
  const [shareDetails, setShareDetails] = useState(editMode ? initial.share_details : false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const ok = await onSave({
        title: title.trim() || null,
        note: note.trim() || null,
        emoji: emoji.trim() || null,
        share_details: shareDetails,
      });
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || saving) return;
    if (!confirm("Xóa sự kiện này?")) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30"
        style={{ zIndex: 100 }}
        onClick={() => !saving && onClose()}
      />
      <div
        className="fixed left-0 right-0 bottom-0 rounded-t-3xl px-5 pt-5 max-w-md mx-auto bg-white lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-md lg:w-full lg:rounded-3xl lg:max-h-[85vh] lg:overflow-y-auto"
        style={{
          zIndex: 110,
          boxShadow: "0 -8px 30px rgba(0,0,0,0.15)",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="w-12 h-1.5 rounded-full bg-rose-100 mx-auto mb-4 lg:hidden" />

        <h2 className="text-lg font-bold text-ink mb-1">
          {editMode ? "Sửa sự kiện" : "Sự kiện mới"}
        </h2>
        <p className="text-xs text-ink-soft mb-4">
          {formatDayVN(initial.start_at)} · {formatTimeVN(initial.start_at)} – {formatTimeVN(initial.end_at)}
        </p>

        <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">
          Tiêu đề
        </label>
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Họp dự án"
          maxLength={200}
          className="w-full text-sm rounded-xl px-3 py-2 mb-3 outline-none"
          style={{ border: "1px solid rgba(220,220,220,0.6)" }}
        />

        <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">
          Ghi chú
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full text-sm rounded-xl px-3 py-2 mb-3 outline-none resize-none leading-relaxed"
          style={{ border: "1px solid rgba(220,220,220,0.6)", fontFamily: "var(--font-body)" }}
        />

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">
              Biểu tượng
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 16))}
              placeholder="🎯"
              className="w-24 text-base rounded-xl px-3 py-2 outline-none text-center"
              style={{ border: "1px solid rgba(220,220,220,0.6)" }}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
            <input
              type="checkbox"
              checked={shareDetails}
              onChange={(e) => setShareDetails(e.target.checked)}
              className="w-4 h-4 accent-rose-400"
            />
            <span className="text-xs text-ink leading-snug">
              Cho người kia<br />thấy chi tiết
            </span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-opacity"
            style={{
              backgroundColor: "#C4667A",
              opacity: saving ? 0.5 : 1,
              boxShadow: "0 4px 12px rgba(196,102,122,0.3)",
            }}
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="px-5 py-3 rounded-2xl text-sm font-medium text-ink-soft"
            style={{ border: "1px solid rgba(255,201,213,0.5)" }}
          >
            Hủy
          </button>
        </div>

        {editMode && onDelete && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="w-full mt-3 py-2 text-sm text-rose-500 underline underline-offset-2 disabled:opacity-50"
          >
            Xóa sự kiện
          </button>
        )}
      </div>
    </>
  );
}
