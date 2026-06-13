"use client";

/**
 * WardrobeOwn — your own wardrobe view. Upload + grid + tag editing.
 * Blueprint §7.3.
 *
 * Upload flow:
 *  1. Pick image (file input, accept=image/*; on mobile, opens camera/library)
 *  2. Client-side canvas crop → 200x200 thumbnail (also compresses original to JPEG)
 *  3. POST /api/wardrobe/upload-urls → signed upload URLs for photo + thumb
 *  4. PUT each blob to its URL
 *  5. POST /api/wardrobe/items with the storage paths
 *  6. Optimistically prepend the new card
 */
import { useState } from "react";
import type { VisibleWardrobeItem } from "./types";

export function WardrobeOwn({ initial }: { initial: VisibleWardrobeItem[] }) {
  const [items, setItems] = useState<VisibleWardrobeItem[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (uploading) return;
    setUploading(true);
    try {
      // Decode to canvas + scale.
      const bitmap = await createImageBitmap(file);
      // Original — capped at 1600px on the longest side, JPEG @ q=0.85
      const fullBlob = await renderToJpeg(bitmap, 1600, 0.85);
      // Thumb — 200x200 center-crop, JPEG @ q=0.8
      const thumbBlob = await renderSquareThumb(bitmap, 200, 0.8);
      bitmap.close();

      const minted = await fetch("/api/wardrobe/upload-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext: "jpg" }),
      }).then((r) => r.json());
      if (!minted?.photo?.uploadUrl || !minted?.thumb?.uploadUrl) throw new Error("mint failed");

      await Promise.all([
        fetch(minted.photo.uploadUrl, { method: "PUT", body: fullBlob, headers: { "Content-Type": "image/jpeg" } }),
        fetch(minted.thumb.uploadUrl, { method: "PUT", body: thumbBlob, headers: { "Content-Type": "image/jpeg" } }),
      ]);

      const res = await fetch("/api/wardrobe/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_path: minted.photo.path, thumbnail_path: minted.thumb.path }),
      });
      if (!res.ok) throw new Error("create row failed");
      const { item } = await res.json();
      setItems((prev) => [item, ...prev]);
    } catch (e) {
      console.error(e);
      alert("Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Lưu trữ bộ này?")) return;
    await fetch(`/api/wardrobe/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    setItems((prev) => prev.filter((x) => x.id !== id));
    setEditingId(null);
  }

  async function handleSaveEdit(id: string, label: string, tags: string[]) {
    const res = await fetch(`/api/wardrobe/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, tags }),
    });
    if (!res.ok) { alert("Lưu thất bại"); return; }
    const { item } = await res.json();
    setItems((prev) => prev.map((x) => (x.id === id ? item : x)));
    setEditingId(null);
  }

  return (
    <div>
      <label
        className="block w-full py-3 mb-4 rounded-2xl text-sm font-semibold text-white text-center cursor-pointer active:scale-[0.98] transition-transform"
        style={{ backgroundColor: "#C4667A", boxShadow: "0 4px 12px rgba(196,102,122,0.3)", opacity: uploading ? 0.5 : 1 }}
      >
        {uploading ? "Đang tải…" : "+ Thêm trang phục"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.currentTarget.value = "";
            if (f) handleFile(f);
          }}
        />
      </label>

      {items.length === 0 ? (
        <p className="text-center text-sm text-ink-soft py-8">Chưa có trang phục nào.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((it) =>
            editingId === it.id ? (
              <div key={it.id} className="col-span-2 md:col-span-3 lg:col-span-4">
                <EditCard
                  item={it}
                  onCancel={() => setEditingId(null)}
                  onArchive={() => handleArchive(it.id)}
                  onSave={(l, t) => handleSaveEdit(it.id, l, t)}
                />
              </div>
            ) : (
              <ItemTile key={it.id} item={it} onClick={() => setEditingId(it.id)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

export function ItemTile({ item, onClick }: { item: VisibleWardrobeItem; onClick: () => void }) {
  const src = item.thumbnail_signed_url ?? item.photo_signed_url ?? "";
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden bg-white"
      style={{ border: "1px solid rgba(255,201,213,0.4)", boxShadow: "0 4px 12px rgba(196,102,122,0.06)" }}
    >
      <div
        className="aspect-square w-full bg-rose-50"
        style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="p-2">
        <p className="text-sm font-semibold text-ink truncate">{item.label || "(no label)"}</p>
        {item.tags.length > 0 && (
          <p className="text-[10px] text-ink-soft truncate">{item.tags.map((t) => `#${t}`).join(" ")}</p>
        )}
      </div>
    </button>
  );
}

function EditCard({
  item,
  onCancel,
  onSave,
  onArchive,
}: {
  item: VisibleWardrobeItem;
  onCancel: () => void;
  onSave: (label: string, tags: string[]) => void;
  onArchive: () => void;
}) {
  const [label, setLabel] = useState(item.label ?? "");
  const [tagsStr, setTagsStr] = useState(item.tags.join(", "));
  const src = item.photo_signed_url ?? item.thumbnail_signed_url ?? "";
  return (
    <div className="rounded-2xl bg-white p-4 space-y-3" style={{ border: "1px solid rgba(255,201,213,0.6)" }}>
      <div className="flex gap-3">
        <div
          className="w-24 h-24 rounded-xl flex-shrink-0 bg-rose-50"
          style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nhãn"
            className="w-full text-sm rounded-xl px-3 py-2 outline-none"
            style={{ border: "1px solid rgba(220,220,220,0.6)" }}
          />
          <input
            type="text"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="tags, cách nhau dấu phẩy"
            className="w-full text-sm rounded-xl px-3 py-2 outline-none"
            style={{ border: "1px solid rgba(220,220,220,0.6)" }}
          />
        </div>
      </div>
      <p className="text-xs text-ink-soft">
        {item.wear_count > 0 ? `Đã mặc ${item.wear_count} lần` : "Chưa mặc lần nào"}
        {item.last_worn_at && ` · gần nhất ${item.last_worn_at.slice(0, 10)}`}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(label.trim(), tagsStr.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform"
          style={{ backgroundColor: "#C4667A" }}
        >
          Lưu
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm text-ink-soft active:scale-95 transition-transform" style={{ border: "1px solid rgba(220,220,220,0.6)" }}>
          Hủy
        </button>
      </div>
      <button onClick={onArchive} className="w-full text-xs text-rose-500 underline underline-offset-2">
        Lưu trữ
      </button>
    </div>
  );
}

// ── Image helpers — client canvas, no extra deps ─────────────────────────

async function renderToJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality)
  );
}

async function renderSquareThumb(bitmap: ImageBitmap, size: number, quality: number): Promise<Blob> {
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality)
  );
}
