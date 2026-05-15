"use client";

/**
 * ReminderToggle — lets Heo enable/disable daily study reminder push.
 * Shows a time picker when enabled.
 */
import { useEffect, useState } from "react";

export function ReminderToggle() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("20:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/notebook/reminder")
      .then((r) => r.json())
      .then(({ enabled: e, time: t }) => {
        setEnabled(e ?? false);
        if (t) setTime(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(newEnabled: boolean, newTime: string) {
    setSaving(true);
    try {
      await fetch("/api/notebook/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled, time: newTime }),
      });
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    await save(next, time);
  }

  async function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const t = e.target.value;
    setTime(t);
    if (enabled) await save(true, t);
  }

  if (loading) return null;

  return (
    <div
      className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
      style={{
        backgroundColor: "rgba(255,249,245,0.9)",
        border: "1px solid rgba(255,201,213,0.35)",
      }}
    >
      <span style={{ fontSize: 18 }}>⏰</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink">Nhắc học mỗi ngày</p>
        {enabled && (
          <input
            type="time"
            value={time}
            onChange={handleTimeChange}
            disabled={saving}
            className="mt-1 text-xs text-rose-500 font-medium bg-transparent outline-none border-b border-rose-200"
          />
        )}
      </div>
      {/* Toggle switch */}
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-label={enabled ? "Tắt nhắc nhở" : "Bật nhắc nhở"}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          enabled ? "bg-rose-400" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
