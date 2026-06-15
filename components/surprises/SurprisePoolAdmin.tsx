"use client";

/**
 * SurprisePoolAdmin — list + add + edit/retire UI for the surprise pool.
 * Blueprint §5.4 — Masuri's maintenance screen.
 */
import { useState, useTransition } from "react";

type PoolItem = {
  id: string;
  body: string;
  language: string;
  weight: number;
  attachments: unknown;
  retired_at: string | null;
  created_at: string | null;
  delivery_count: number;
  last_delivered_at: string | null;
};

type Language = "vi" | "en" | "mixed";

export function SurprisePoolAdmin({ initialItems }: { initialItems: PoolItem[] }) {
  const [items, setItems] = useState<PoolItem[]>(initialItems);
  const [, startTransition] = useTransition();

  // ── Add form state ──────────────────────────────────────────────────────
  const [newBody, setNewBody] = useState("");
  const [newLang, setNewLang] = useState<Language>("vi");
  const [newWeight, setNewWeight] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const res = await fetch("/api/surprises/pool", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/surprises/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newBody, language: newLang, weight: newWeight }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Add failed");
        return;
      }
      setNewBody("");
      setNewLang("vi");
      setNewWeight(1);
      startTransition(() => {
        refresh();
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl p-4 space-y-3"
        style={{ backgroundColor: "white", border: "1px solid rgba(255,201,213,0.5)", boxShadow: "var(--shadow)" }}
      >
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Add new surprise</p>
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          rows={3}
          placeholder="Surprise message for Heo..."
          className="w-full rounded-lg px-3 py-2 text-sm text-ink resize-none outline-none"
          style={{ border: "1px solid rgba(220,220,220,0.6)", backgroundColor: "rgba(255,249,245,0.5)" }}
        />
        <div className="flex items-center gap-3">
          <select
            value={newLang}
            onChange={(e) => setNewLang(e.target.value as Language)}
            className="text-xs px-2 py-1.5 rounded-lg outline-none"
            style={{ border: "1px solid rgba(220,220,220,0.6)" }}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
            <option value="mixed">Mixed</option>
          </select>
          <label className="text-xs text-ink-soft flex items-center gap-1.5">
            Weight
            <input
              type="number"
              min={1}
              max={10}
              value={newWeight}
              onChange={(e) => setNewWeight(parseInt(e.target.value, 10) || 1)}
              className="w-14 text-xs px-2 py-1.5 rounded-lg outline-none"
              style={{ border: "1px solid rgba(220,220,220,0.6)" }}
            />
          </label>
          <button
            type="submit"
            disabled={!newBody.trim() || submitting}
            className="ml-auto text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity"
            style={{
              backgroundColor: "#C4667A",
              opacity: !newBody.trim() || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </div>
      </form>

      {/* List */}
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft text-center py-8">
          No surprises yet. Add a few above 🎁
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <PoolItemRow key={item.id} item={item} onChange={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PoolItemRow({ item, onChange }: { item: PoolItem; onChange: () => void }) {
  const retired = item.retired_at !== null;
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/surprises/pool/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Update failed");
        return;
      }
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className="rounded-2xl p-4"
      style={{
        backgroundColor: retired ? "rgba(245,245,245,0.6)" : "white",
        border: `1px solid ${retired ? "rgba(220,220,220,0.5)" : "rgba(255,201,213,0.4)"}`,
        boxShadow: retired ? "none" : "var(--shadow)",
        opacity: retired ? 0.6 : 1,
      }}
    >
      <p className={`text-sm text-ink leading-relaxed mb-2 ${retired ? "line-through" : ""}`}>
        {item.body}
      </p>
      <div className="flex items-center gap-3 text-xs text-ink-soft">
        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(237,232,245,0.7)", color: "#6B21A8" }}>
          {item.language}
        </span>
        <span>weight {item.weight}</span>
        <span>delivered {item.delivery_count}×</span>
        {item.last_delivered_at && (
          <span title={new Date(item.last_delivered_at).toLocaleString("vi-VN")}>
            last {new Date(item.last_delivered_at).toLocaleDateString("vi-VN")}
          </span>
        )}
        {retired && <span className="text-rose-400 font-medium">retired</span>}
        <button
          onClick={() => patch({ retire: !retired })}
          disabled={busy}
          className="ml-auto text-xs underline underline-offset-2"
          style={{ color: retired ? "#5AAF75" : "#C4667A" }}
        >
          {retired ? "Un-retire" : "Retire"}
        </button>
      </div>
    </li>
  );
}
