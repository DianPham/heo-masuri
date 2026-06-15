"use client";

/**
 * WardrobePartner — view the OTHER user's wardrobe, tap an item to suggest
 * it for an upcoming date. Blueprint §7.3.
 *
 * `partnerSlug` controls the route the suggest endpoint targets.
 */
import { useState } from "react";
import { ItemTile } from "./WardrobeOwn";
import type { VisibleWardrobeItem } from "./types";

type Props = {
  partnerSlug: "heo" | "masuri";
  initial: VisibleWardrobeItem[];
};

export function WardrobePartner({ partnerSlug, initial }: Props) {
  const [items] = useState<VisibleWardrobeItem[]>(initial);
  const [picked, setPicked] = useState<VisibleWardrobeItem | null>(null);

  if (items.length === 0) {
    return (
      <div
        className="text-center py-10 px-6 rounded-2xl"
        style={{ border: "1px dashed var(--color-hairline-strong)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          Tủ đồ của người ấy còn trống.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="page-subtitle mb-4">Nhấn vào một bộ để gợi ý cho lần hẹn tới.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it) => (
          <ItemTile key={it.id} item={it} onClick={() => setPicked(it)} />
        ))}
      </div>

      {picked && (
        <SuggestSheet
          item={picked}
          partnerSlug={partnerSlug}
          onClose={() => setPicked(null)}
        />
      )}
    </>
  );
}

function SuggestSheet({
  item,
  partnerSlug,
  onClose,
}: {
  item: VisibleWardrobeItem;
  partnerSlug: "heo" | "masuri";
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/wardrobe/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wardrobe_item: item.id,
          target_user: partnerSlug,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) { alert("Gửi không được, thử lại nha"); return; }
      alert("Đã gửi cho người ấy 💕");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const src = item.photo_signed_url ?? item.thumbnail_signed_url ?? "";
  return (
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 100, background: "rgba(20, 10, 14, 0.45)", backdropFilter: "blur(2px)" }}
        onClick={() => !saving && onClose()}
      />
      <div
        className="fixed left-0 right-0 bottom-0 rounded-t-3xl px-6 pt-5 max-w-md mx-auto bg-white lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl"
        style={{ zIndex: 110, boxShadow: "var(--shadow-lg)", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-4 lg:hidden"
          style={{ background: "rgba(58,33,41,0.12)" }}
        />
        <p className="section-eyebrow mb-1.5">Gợi ý đồ mặc</p>
        <h2
          className="font-medium tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-ink)", lineHeight: 1.15 }}
        >
          Chọn cho người ấy mặc nha
        </h2>
        <p className="page-subtitle mb-4">Người ấy sẽ nhận được thông báo gợi ý.</p>

        <div className="surface-card-soft flex gap-3.5 p-3 mb-4">
          <div
            className="w-16 h-16 rounded-lg flex-shrink-0"
            style={{
              background: "rgba(58,33,41,0.04)",
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
              {item.label || "Đồ chưa đặt tên"}
            </p>
            {item.tags.length > 0 && (
              <p className="text-[11.5px] mt-1" style={{ color: "var(--color-ink-mute)" }}>
                {item.tags.map((t) => `#${t}`).join(" ")}
              </p>
            )}
          </div>
        </div>

        <label className="field-label">Lời nhắn (nếu muốn)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Trông sẽ rất xinh…"
          className="input-base resize-none mb-4"
        />

        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 py-3">
            {saving ? "Đang gửi…" : "Gửi gợi ý"}
          </button>
          <button onClick={() => !saving && onClose()} className="btn-ghost">
            Hủy
          </button>
        </div>
      </div>
    </>
  );
}
