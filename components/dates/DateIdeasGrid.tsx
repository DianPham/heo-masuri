"use client";

/**
 * DateIdeasGrid — polaroid-style grid of date ideas. Blueprint §7.1.
 *
 * Mobile: 2 columns. Desktop: 3-4 columns via Tailwind responsive grid.
 * Each card shows thumbnail (or pink placeholder), title, slot-type chip, tags.
 * Click → inline edit. Top "+ Add" button opens an inline add form.
 */
import { useMemo, useRef, useState } from "react";

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
      <div className="flex gap-1.5 mb-4 flex-wrap">
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
        <button onClick={() => setEditingId("new")} className="btn-primary w-full mb-5 py-3">
          + Thêm ý tưởng
        </button>
      )}

      {filtered.length === 0 ? (
        <div
          className="text-center py-10 px-6 rounded-2xl"
          style={{ borderStyle: "dashed", border: "1px dashed var(--color-hairline-strong)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            {ideas.length === 0 ? "Chưa có ý tưởng nào." : "Không có ý tưởng nào trong loại này."}
          </p>
        </div>
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
              <IdeaCard
                key={i.id}
                idea={i}
                onEdit={() => setEditingId(i.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`chip ${active ? "chip-active" : ""}`}>
      {children}
    </button>
  );
}

function IdeaCard({ idea, onEdit }: { idea: DateIdea; onEdit: () => void }) {
  // Interaction model:
  //   - tap / click → opens idea.url in a new tab (or falls through to edit
  //     if no URL is saved)
  //   - right-click (desktop) → opens the edit form
  //   - long-press (mobile, ~500ms) → opens the edit form
  // Long-press cancels on touchmove (so vertical scrolls don't trigger).
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  function startLongPress() {
    longPressedRef.current = false;
    pressTimer.current = setTimeout(() => {
      longPressedRef.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      onEdit();
    }, 500);
  }
  function cancelLongPress() {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }
  function handleClick(e: React.MouseEvent) {
    // Suppress the synthetic click that fires after a successful long-press.
    if (longPressedRef.current) {
      longPressedRef.current = false;
      e.preventDefault();
      return;
    }
    if (idea.url) {
      window.open(idea.url, "_blank", "noopener,noreferrer");
    } else {
      onEdit();
    }
  }
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    onEdit();
  }

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={startLongPress}
      onTouchMove={cancelLongPress}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      title={idea.url ? "Mở · chuột phải để chỉnh sửa" : "Chỉnh sửa"}
      className="surface-card group text-left overflow-hidden flex flex-col transition-all active:scale-[0.98] hover:translate-y-[-2px]"
      style={{
        boxShadow: "var(--shadow-sm)",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        userSelect: "none",
      }}
    >
      <div
        className="aspect-square w-full flex items-center justify-center"
        style={{
          background: idea.thumbnail_url ? undefined : "rgba(58,33,41,0.04)",
          backgroundImage: idea.thumbnail_url ? `url(${idea.thumbnail_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!idea.thumbnail_url && (
          <span className="text-3xl" style={{ color: "var(--color-ink-mute)" }}>
            ✨
          </span>
        )}
      </div>
      <div className="p-3 flex-1">
        <p
          className="text-[13.5px] font-semibold tracking-tight line-clamp-2"
          style={{ color: "var(--color-ink)", lineHeight: 1.3 }}
        >
          {idea.title || idea.url || idea.notes || "Ý tưởng chưa đặt tên"}
        </p>
        {idea.slot_type && (
          <p className="text-[11px] mt-1.5" style={{ color: "var(--color-accent)" }}>
            {SLOT_LABEL_VI[idea.slot_type]}
          </p>
        )}
        {idea.tags.length > 0 && (
          <p className="text-[10.5px] mt-1 truncate" style={{ color: "var(--color-ink-mute)" }}>
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
    const cleanedInput = values.url.trim();
    if (!cleanedInput) return;
    setPreviewing(true);
    try {
      // ai=1 routes the result through DeepSeek for a clean VI title /
      // description / slot guess / tags before returning. Cheaper than a
      // second round-trip and the server already has the raw caption in hand.
      const res = await fetch(
        `/api/dates/preview?ai=1&url=${encodeURIComponent(cleanedInput)}`
      );
      if (!res.ok) return;
      let data = await res.json();

      // If server returned nulls for TikTok, retry the oEmbed call from the
      // browser. TikTok gates server IPs but lets browsers through.
      if (
        !data.title &&
        !data.image &&
        data.source === "tiktok.com" &&
        data.canonical_url
      ) {
        const retry = await tryClientTikTokOembed(data.canonical_url);
        if (retry) data = { ...data, ...retry };
      }

      const ai = data.ai ?? null;
      setValues((prev) => ({
        ...prev,
        // AI title wins over raw title when present; user can still overwrite.
        title: prev.title || ai?.title || data.title || "",
        description: prev.description || ai?.description || data.description || "",
        thumbnail_url: prev.thumbnail_url || data.image || "",
        slot_type: prev.slot_type || (ai?.slot_type ?? "") || prev.slot_type,
        tags:
          prev.tags ||
          (Array.isArray(ai?.tags) && ai.tags.length > 0
            ? ai.tags.join(", ")
            : ""),
      }));
    } finally {
      setPreviewing(false);
    }
  }

  async function tryClientTikTokOembed(canonicalUrl: string) {
    // TikTok preserves a tracking `?_r=...&_t=...` query string on shared
    // links — oEmbed responds 400 if those are present. Strip before calling.
    let cleanUrl = canonicalUrl;
    try {
      const u = new URL(canonicalUrl);
      u.search = "";
      cleanUrl = u.toString();
    } catch { /* fall through with original */ }

    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
      const r = await fetch(oembedUrl, { headers: { Accept: "application/json" } });
      if (!r.ok) return null;
      const d = await r.json();
      // Sanitize: TikTok's degraded oEmbed hands back author_name "@" with an
      // empty title. Strip the leading @ and drop an empty author so we never
      // save a title of just "@" (the exact bug being fixed here).
      const author = (d.author_name || "").trim().replace(/^@+/, "").trim();
      const caption = (d.title || "").trim();
      const image = (d.thumbnail_url || "").trim();
      const title =
        caption && author
          ? `@${author} · ${caption}`
          : caption || (author ? `@${author}` : "");
      if (!title && !image) return null;
      return {
        title,
        description: author ? `@${author}` : "",
        image,
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
    <div className="surface-card p-5 space-y-3.5 mb-5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <Field label="URL">
        <div className="flex gap-2">
          <input
            type="url"
            value={values.url}
            onChange={(e) => set("url", e.target.value)}
            onBlur={tryPreview}
            placeholder="https://tiktok.com/..."
            className="input-base flex-1"
          />
          <button
            onClick={tryPreview}
            disabled={previewing || !values.url.trim()}
            className="btn-ghost whitespace-nowrap"
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
          className="input-base"
        />
      </Field>
      <Field label="Mô tả">
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          maxLength={1000}
          className="input-base resize-none"
        />
      </Field>
      <Field label="Ghi chú">
        <input
          type="text"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={500}
          placeholder="cho ngày mưa, dễ thương, v.v."
          className="input-base"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Loại">
          <select
            value={values.slot_type}
            onChange={(e) => set("slot_type", e.target.value as FormValues["slot_type"])}
            className="input-base bg-white"
          >
            <option value="">(chọn loại)</option>
            {SLOT_LIST.map((s) => (
              <option key={s} value={s}>{SLOT_LABEL_VI[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Tags · cách nhau bằng phẩy">
          <input
            type="text"
            value={values.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="outdoor, cheap"
            className="input-base"
          />
        </Field>
      </div>
      {values.thumbnail_url && (
        <p className="text-[11px] truncate" style={{ color: "var(--color-ink-mute)" }}>
          Ảnh: {values.thumbnail_url}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
        <button onClick={onCancel} className="btn-ghost">
          Hủy
        </button>
      </div>
      {onArchive && (
        <button
          onClick={onArchive}
          className="w-full text-[11.5px] py-1 transition-colors"
          style={{ color: "var(--color-ink-mute)" }}
        >
          Lưu trữ ý tưởng này
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
