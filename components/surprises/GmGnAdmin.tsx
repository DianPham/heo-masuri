"use client";

/**
 * GmGnAdmin — single GM or GN config card.
 * Blueprint §5.5. Shows: enabled toggle, send-time picker, editable pool,
 * and the last-delivered status.
 */
import { useState } from "react";

export type GmGnConfig = {
  id?: string;
  kind: "gm" | "gn";
  pool: string[];
  send_at_local: string;          // "HH:MM:SS"
  enabled: boolean;
  timezone?: string;
  last_delivered_at?: string | null;
  last_pool_index?: number;
};

const LABELS = {
  gm: { vi: "Chào buổi sáng", emoji: "🌸", defaultTime: "07:00" },
  gn: { vi: "Chúc ngủ ngon", emoji: "🌙", defaultTime: "22:00" },
} as const;

function toHHMM(t?: string | null): string {
  if (!t) return "";
  // DB returns "HH:MM:SS" — input[type=time] wants "HH:MM"
  return t.slice(0, 5);
}

export function GmGnAdmin({
  kind,
  initial,
}: {
  kind: "gm" | "gn";
  initial: GmGnConfig | null;
}) {
  const label = LABELS[kind];

  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [time, setTime] = useState(toHHMM(initial?.send_at_local) || label.defaultTime);
  const [poolText, setPoolText] = useState(
    (initial?.pool ?? []).join("\n") ||
      (kind === "gm" ? "Chào buổi sáng Heo 🌸" : "Chúc Heo ngủ ngon nha 🌙")
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const poolArray = poolText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleSave() {
    if (saving) return;
    if (poolArray.length === 0) {
      alert("Pool cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/gmgn/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [kind]: { enabled, send_at_local: time, pool: poolArray },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Save failed");
        return;
      }
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "white",
        border: "1px solid rgba(255,201,213,0.4)",
        boxShadow: "var(--shadow)",
      }}
    >
      <header className="flex items-center gap-2 mb-4">
        <span style={{ fontSize: 22 }}>{label.emoji}</span>
        <h2 className="text-base font-bold text-ink">{label.vi}</h2>
        <label className="ml-auto inline-flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-ink-soft">{enabled ? "On" : "Off"}</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-rose-400"
          />
        </label>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-ink-soft">
          Send time (VN)
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="block w-full mt-1 text-sm px-3 py-2 rounded-lg outline-none"
            style={{ border: "1px solid rgba(220,220,220,0.6)" }}
          />
        </label>
        <div className="text-xs text-ink-soft">
          {initial?.last_delivered_at ? (
            <>
              <p>Last sent</p>
              <p className="text-ink mt-1">
                {new Date(initial.last_delivered_at).toLocaleString("vi-VN")}
              </p>
              <p className="mt-1 opacity-70">
                Pool index: {initial.last_pool_index ?? -1} / {poolArray.length - 1}
              </p>
            </>
          ) : (
            <p className="italic opacity-70">Never sent yet</p>
          )}
        </div>
      </div>

      <label className="text-xs text-ink-soft">
        Pool (one message per line, rotates daily)
        <textarea
          value={poolText}
          onChange={(e) => setPoolText(e.target.value)}
          rows={6}
          spellCheck={false}
          className="block w-full mt-1 text-sm px-3 py-2 rounded-lg outline-none resize-y leading-relaxed"
          style={{ border: "1px solid rgba(220,220,220,0.6)", fontFamily: "var(--font-body)" }}
        />
      </label>
      <p className="text-xs text-ink-soft mt-1 opacity-70">{poolArray.length} entries</p>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity"
          style={{ backgroundColor: "#C4667A", opacity: saving ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {savedAt && (
          <span className="text-xs text-green-700">
            ✓ Saved {savedAt.toLocaleTimeString("vi-VN")}
          </span>
        )}
      </div>
    </section>
  );
}
