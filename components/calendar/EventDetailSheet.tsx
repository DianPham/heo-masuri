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
  const [shareDetails, setShareDetails] = useState(editMode ? initial.share_details : true);
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
    if (!confirm("Xóa sự kiện này nha?")) return;
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
        className="fixed inset-0"
        style={{ zIndex: 100, background: "rgba(20,10,14,0.45)", backdropFilter: "blur(2px)" }}
        onClick={() => !saving && onClose()}
      />
      <div
        className="fixed left-0 right-0 bottom-0 rounded-t-3xl px-6 pt-5 max-w-md mx-auto bg-white lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-md lg:w-full lg:rounded-2xl lg:max-h-[85vh] lg:overflow-y-auto"
        style={{
          zIndex: 110,
          boxShadow: "var(--shadow-lg)",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-4 lg:hidden"
          style={{ background: "rgba(58,33,41,0.12)" }}
        />

        <p className="section-eyebrow mb-1.5">{editMode ? "Sửa sự kiện" : "Sự kiện mới"}</p>
        <h2
          className="font-medium tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--color-ink)" }}
        >
          {formatDayVN(initial.start_at)}
        </h2>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--color-ink-soft)" }}>
          {formatTimeVN(initial.start_at)} – {formatTimeVN(initial.end_at)}
        </p>

        <label className="field-label">Đặt tên</label>
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Họp, đi học, đi gym…"
          maxLength={200}
          className="input-base mb-3"
        />

        <label className="field-label">Ghi chú (nếu cần)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          className="input-base resize-none mb-3 leading-relaxed"
          style={{ fontFamily: "var(--font-body)" }}
        />

        <div className="flex items-center gap-4 mb-5">
          <div>
            <label className="field-label">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 16))}
              placeholder="🎯"
              className="input-base text-center"
              style={{ width: 72 }}
            />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1 pt-5">
            <input
              type="checkbox"
              checked={shareDetails}
              onChange={(e) => setShareDetails(e.target.checked)}
              className="w-4 h-4"
              style={{ accentColor: "var(--color-accent)" }}
            />
            <span className="text-[12.5px] leading-snug" style={{ color: "var(--color-ink)" }}>
              Người ấy được xem chi tiết
            </span>
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3">
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
          <button onClick={() => !saving && onClose()} disabled={saving} className="btn-ghost">
            Hủy
          </button>
        </div>

        {editMode && onDelete && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="w-full mt-3 py-2 text-[12px] disabled:opacity-50"
            style={{ color: "var(--color-ink-mute)" }}
          >
            Xóa sự kiện này
          </button>
        )}
      </div>
    </>
  );
}
