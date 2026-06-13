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
    return <p className="text-center text-sm text-ink-soft py-8">Tủ đồ của người ấy trống.</p>;
  }

  return (
    <>
      <p className="text-xs text-ink-soft mb-3">Nhấn vào một bộ để gợi ý cho lần hẹn tới.</p>
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
      if (!res.ok) { alert("Gợi ý thất bại"); return; }
      alert("Đã gửi gợi ý 💕");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const src = item.photo_signed_url ?? item.thumbnail_signed_url ?? "";
  return (
    <>
      <div className="fixed inset-0 bg-black/30" style={{ zIndex: 100 }} onClick={() => !saving && onClose()} />
      <div
        className="fixed left-0 right-0 bottom-0 rounded-t-3xl px-5 pt-5 max-w-md mx-auto bg-white lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl"
        style={{ zIndex: 110, boxShadow: "0 -8px 30px rgba(0,0,0,0.15)", paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        <div className="w-12 h-1.5 rounded-full bg-rose-100 mx-auto mb-4 lg:hidden" />
        <h2 className="text-lg font-bold text-ink mb-1">Gợi ý outfit</h2>
        <p className="text-xs text-ink-soft mb-3">Người ấy sẽ nhận được thông báo.</p>

        <div className="flex gap-3 mb-3">
          <div
            className="w-20 h-20 rounded-xl flex-shrink-0 bg-rose-50"
            style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{item.label || "(no label)"}</p>
            {item.tags.length > 0 && (
              <p className="text-xs text-ink-soft mt-1">{item.tags.map((t) => `#${t}`).join(" ")}</p>
            )}
          </div>
        </div>

        <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">Lời nhắn (tùy chọn)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Trông sẽ rất xinh…"
          className="w-full text-sm rounded-xl px-3 py-2 mb-4 outline-none resize-none"
          style={{ border: "1px solid rgba(220,220,220,0.6)" }}
        />

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white active:scale-95 transition-transform"
            style={{ backgroundColor: "#C4667A", opacity: saving ? 0.5 : 1 }}
          >
            {saving ? "Đang gửi…" : "Gửi gợi ý"}
          </button>
          <button onClick={() => !saving && onClose()} className="px-5 py-3 rounded-2xl text-sm text-ink-soft active:scale-95 transition-transform" style={{ border: "1px solid rgba(255,201,213,0.5)" }}>
            Hủy
          </button>
        </div>
      </div>
    </>
  );
}
