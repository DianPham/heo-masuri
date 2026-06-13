"use client";

/**
 * DateIdeasGrid — polaroid-style grid of date ideas. Blueprint §7.1.
 *
 * Mobile: 2 columns. Desktop: 3-4 columns via Tailwind responsive grid.
 * Each card shows thumbnail (or pink placeholder), title, slot-type chip, tags.
 * Click → inline edit. Top "+ Add" button opens an inline add form.
 */
import { useMemo, useState } from "react";

export type DateIdea = {
  id: string;
  added_by: string;
  url: string | null;
  title: string | null;
  description: string | null;
  notes: string | null;
  tags: string[];
  slot_type: SlotType | null;
  thumbnail_url: string | null;
  archived: boolean;
  used_count: number;
  last_used_at: string | null;
  created_at: string | null;
};

type SlotType = "eat" | "drink" | "activity" | "walk" | "movie" | "drive" | "home" | "other";

const SLOT_LABEL_VI: Record<SlotType, string> = {
  eat: "🍜 Ăn",
  drink: "☕ Uống",
  activity: "🎨 Hoạt động",
  walk: "🚶 Đi dạo",
  movie: "🎬 Phim",
  drive: "🚗 Lái xe",
  home: "🏠 Ở nhà",
  other: "✨ Khác",
};

const SLOT_LIST: SlotType[] = ["eat","drink","activity","walk","movie","drive","home","other"];

type FormValues = {
  url: string;
  title: string;
  description: string;
  notes: string;
  tags: string;
  slot_type: SlotType | "";
  thumbnail_url: string;
};

function emptyForm(): FormValues {
  return { url: "", title: "", description: "", notes: "", tags: "", slot_type: "", thumbnail_url: "" };
}

function fromIdea(i: DateIdea): FormValues {
  return {
    url: i.url ?? "",
    title: i.title ?? "",
    description: i.description ?? "",
    notes: i.notes ?? "",
    tags: i.tags.join(", "),
    slot_type: i.slot_type ?? "",
    thumbnail_url: i.thumbnail_url ?? "",
  };
}

function tagList(s: string): string[] {
  return s.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
}

export function DateIdeasGrid({ initial }: { initial: DateIdea[] }) {
  const [ideas, setIdeas] = useState<DateIdea[]>(initial);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [slotFilter, setSlotFilter] = useState<SlotType | "all">("all");

  const filtered = useMemo(() => {
    if (slotFilter === "all") return ideas;
    return ideas.filter((i) => i.slot_type === slotFilter);
  }, [ideas, slotFilter]);

  return (
    <div>
      {/* Filter chips */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <Chip active={slotFilter === "all"} onClick={() => setSlotFilter("all")}>Tất cả</Chip>
        {SLOT_LIST.map((s) => (
          <Chip key={s} active={slotFilter === s} onClick={() => setSlotFilter(s)}>{SLOT_LABEL_VI[s]}</Chip>
        ))}
      </div>

      {editingId === "new" ? (
        <IdeaForm
          initial={emptyForm()}
          onCancel={() => setEditingId(null)}
          onSave={async (values) => {
            const res = await fetch("/api/dates/ideas", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: values.url || null,
                title: values.title || null,
                description: values.description || null,
                notes: values.notes || null,
                tags: tagList(values.tags),
                slot_type: values.slot_type || null,
                thumbnail_url: values.thumbnail_url || null,
              }),
            });
            if (!res.ok) { alert("Lưu thất bại"); return false; }
            const { idea } = await res.json();
            setIdeas((prev) => [idea, ...prev]);
            setEditingId(null);
            return true;
          }}
        />
      ) : (
        <button
          onClick={() => setEditingId("new")}
          className="w-full py-3 mb-4 rounded-2xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#C4667A", boxShadow: "0 4px 12px rgba(196,102,122,0.3)" }}
        >
          + Thêm ý tưởng
        </button>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-ink-soft py-10">
          {ideas.length === 0 ? "Chưa có ý tưởng nào." : "Không có ý tưởng nào trong loại này."}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((i) =>
            editingId === i.id ? (
              <div key={i.id} className="col-span-2 md:col-span-3 lg:col-span-4">
                <IdeaForm
                  initial={fromIdea(i)}
                  onCancel={() => setEditingId(null)}
                  onArchive={async () => {
                    await fetch(`/api/dates/ideas/${i.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ archived: true }),
                    });
                    setIdeas((prev) => prev.filter((x) => x.id !== i.id));
                    setEditingId(null);
                  }}
                  onSave={async (values) => {
                    const res = await fetch(`/api/dates/ideas/${i.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        url: values.url || null,
                        title: values.title || null,
                        description: values.description || null,
                        notes: values.notes || null,
                        tags: tagList(values.tags),
                        slot_type: values.slot_type || null,
                        thumbnail_url: values.thumbnail_url || null,
                      }),
                    });
                    if (!res.ok) { alert("Lưu thất bại"); return false; }
                    const { idea } = await res.json();
                    setIdeas((prev) => prev.map((x) => (x.id === i.id ? idea : x)));
                    setEditingId(null);
                    return true;
                  }}
                />
              </div>
            ) : (
              <IdeaCard key={i.id} idea={i} onClick={() => setEditingId(i.id)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap"
      style={{
        backgroundColor: active ? "rgba(255,201,213,0.6)" : "rgba(255,255,255,0.7)",
        color: active ? "#C4667A" : "#666",
        border: "1px solid rgba(255,201,213,0.4)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function IdeaCard({ idea, onClick }: { idea: DateIdea; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow flex flex-col"
      style={{ border: "1px solid rgba(255,201,213,0.4)", boxShadow: "0 4px 12px rgba(196,102,122,0.06)" }}
    >
      <div
        className="aspect-square w-full flex items-center justify-center bg-rose-50"
        style={{ backgroundImage: idea.thumbnail_url ? `url(${idea.thumbnail_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        {!idea.thumbnail_url && <span className="text-3xl opacity-60">✨</span>}
      </div>
      <div className="p-2.5 flex-1">
        <p className="text-sm font-semibold text-ink line-clamp-2">
          {idea.title || idea.url || idea.notes || "(no title)"}
        </p>
        {idea.slot_type && (
          <p className="text-[10px] text-rose-500 mt-1">{SLOT_LABEL_VI[idea.slot_type]}</p>
        )}
        {idea.tags.length > 0 && (
          <p className="text-[10px] text-ink-soft mt-1 truncate">
            {idea.tags.map((t) => `#${t}`).join(" ")}
          </p>
        )}
      </div>
    </button>
  );
}

function IdeaForm({
  initial,
  onCancel,
  onSave,
  onArchive,
}: {
  initial: FormValues;
  onCancel: () => void;
  onSave: (v: FormValues) => Promise<boolean>;
  onArchive?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function tryPreview() {
    if (!values.url.trim()) return;
    setPreviewing(true);
    try {
      const res = await fetch(`/api/dates/preview?url=${encodeURIComponent(values.url)}`);
      if (!res.ok) return;
      let data = await res.json();

      // If server returned nulls for TikTok, retry from the browser. TikTok
      // gates its endpoints by IP — Vercel's edge gets blocked, the user's
      // browser doesn't. TikTok's oEmbed allows CORS so this just works.
      if (
        !data.title &&
        !data.image &&
        data.source === "tiktok.com" &&
        data.canonical_url
      ) {
        const retry = await tryClientTikTokOembed(data.canonical_url);
        if (retry) data = { ...data, ...retry };
      }

      setValues((prev) => ({
        ...prev,
        title: prev.title || data.title || "",
        description: prev.description || data.description || "",
        thumbnail_url: prev.thumbnail_url || data.image || "",
      }));
    } finally {
      setPreviewing(false);
    }
  }

  async function tryClientTikTokOembed(canonicalUrl: string) {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`;
      const r = await fetch(oembedUrl, { headers: { Accept: "application/json" } });
      if (!r.ok) return null;
      const d = await r.json();
      const title =
        d.title && d.author_name ? `${d.author_name} · ${d.title}` : d.title || d.author_name || "";
      if (!title && !d.thumbnail_url) return null;
      return {
        title,
        description: d.author_name || "",
        image: d.thumbnail_url || "",
      };
    } catch {
      return null;
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try { await onSave(values); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl bg-white p-4 space-y-3 mb-3" style={{ border: "1px solid rgba(255,201,213,0.6)" }}>
      <Field label="URL">
        <div className="flex gap-2">
          <input
            type="url"
            value={values.url}
            onChange={(e) => set("url", e.target.value)}
            onBlur={tryPreview}
            placeholder="https://tiktok.com/..."
            className="flex-1 text-sm rounded-xl px-3 py-2 outline-none"
            style={{ border: "1px solid rgba(220,220,220,0.6)" }}
          />
          <button
            onClick={tryPreview}
            disabled={previewing || !values.url.trim()}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-ink-soft whitespace-nowrap"
            style={{ border: "1px solid rgba(220,220,220,0.6)", opacity: previewing ? 0.5 : 1 }}
          >
            {previewing ? "Đang lấy…" : "Tự lấy"}
          </button>
        </div>
      </Field>
      <Field label="Tiêu đề">
        <input
          type="text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={200}
          className="w-full text-sm rounded-xl px-3 py-2 outline-none"
          style={{ border: "1px solid rgba(220,220,220,0.6)" }}
        />
      </Field>
      <Field label="Mô tả">
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          maxLength={1000}
          className="w-full text-sm rounded-xl px-3 py-2 outline-none resize-none"
          style={{ border: "1px solid rgba(220,220,220,0.6)" }}
        />
      </Field>
      <Field label="Ghi chú">
        <input
          type="text"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={500}
          placeholder="cho ngày mưa, dễ thương, v.v."
          className="w-full text-sm rounded-xl px-3 py-2 outline-none"
          style={{ border: "1px solid rgba(220,220,220,0.6)" }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Loại">
          <select
            value={values.slot_type}
            onChange={(e) => set("slot_type", e.target.value as FormValues["slot_type"])}
            className="w-full text-sm rounded-xl px-3 py-2 outline-none bg-white"
            style={{ border: "1px solid rgba(220,220,220,0.6)" }}
          >
            <option value="">(chọn loại)</option>
            {SLOT_LIST.map((s) => (
              <option key={s} value={s}>{SLOT_LABEL_VI[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Tags (cách nhau dấu phẩy)">
          <input
            type="text"
            value={values.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="outdoor, cheap"
            className="w-full text-sm rounded-xl px-3 py-2 outline-none"
            style={{ border: "1px solid rgba(220,220,220,0.6)" }}
          />
        </Field>
      </div>
      {values.thumbnail_url && (
        <div className="text-xs text-ink-soft">
          Ảnh: <span className="truncate">{values.thumbnail_url}</span>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform" style={{ backgroundColor: "#C4667A", opacity: saving ? 0.5 : 1 }}>
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm text-ink-soft active:scale-95 transition-transform" style={{ border: "1px solid rgba(220,220,220,0.6)" }}>
          Hủy
        </button>
      </div>
      {onArchive && (
        <button onClick={onArchive} className="w-full text-xs text-rose-500 underline underline-offset-2">
          Lưu trữ ý tưởng này
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
