"use client";

/**
 * NotebookSettings — reminder toggle + preferred topics picker.
 * Used on /heo/notebook/settings.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TOUR_LS_KEY = "nb_tour_v2_done";

// Topics that Heo can pick from (must match routine generation options)
const ALL_TOPICS = [
  { id: "daily_life",     label: "Cuộc sống hàng ngày",  emoji: "🏠" },
  { id: "food",           label: "Đồ ăn & uống",          emoji: "🍜" },
  { id: "travel",         label: "Du lịch",                emoji: "✈️" },
  { id: "emotions",       label: "Cảm xúc",                emoji: "💕" },
  { id: "nature",         label: "Thiên nhiên",            emoji: "🌿" },
  { id: "animals",        label: "Động vật",               emoji: "🐷" },
  { id: "work_study",     label: "Học tập & công việc",   emoji: "📚" },
  { id: "shopping",       label: "Mua sắm",                emoji: "🛍️" },
  { id: "hobbies",        label: "Sở thích",               emoji: "🎨" },
  { id: "relationships",  label: "Bạn bè & gia đình",     emoji: "👫" },
];

type Prefs = {
  reminder_enabled: boolean;
  reminder_time: string | null;
  preferred_topics: string[];
};

export function NotebookSettings() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>({
    reminder_enabled: true,   // default ON until server responds
    reminder_time: "20:00",
    preferred_topics: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/notebook/reminder").then((r) => r.json()),
      fetch("/api/notebook/prefs").then((r) => r.json()),
    ])
      .then(([rem, p]) => {
        setPrefs({
          reminder_enabled: rem.enabled ?? false,
          reminder_time: rem.time ?? "20:00",
          preferred_topics: Array.isArray(p.preferred_topics) ? p.preferred_topics : [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(next: Prefs) {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all([
        fetch("/api/notebook/reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: next.reminder_enabled, time: next.reminder_time }),
        }),
        fetch("/api/notebook/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferred_topics: next.preferred_topics }),
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function toggleReminder() {
    const next = { ...prefs, reminder_enabled: !prefs.reminder_enabled };
    setPrefs(next);
    save(next);
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = { ...prefs, reminder_time: e.target.value };
    setPrefs(next);
    if (prefs.reminder_enabled) save(next);
  }

  function toggleTopic(id: string) {
    const topics = prefs.preferred_topics.includes(id)
      ? prefs.preferred_topics.filter((t) => t !== id)
      : [...prefs.preferred_topics, id];
    const next = { ...prefs, preferred_topics: topics };
    setPrefs(next);
    save(next);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-2xl bg-rose-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Reminder section ─────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-3">
          Nhắc học mỗi ngày
        </p>

        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            backgroundColor: "rgba(255,249,245,0.9)",
            border: "1px solid rgba(255,201,213,0.35)",
          }}
        >
          <span style={{ fontSize: 20 }}>⏰</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Nhắc nhở</p>
            {prefs.reminder_enabled && (
              <input
                type="time"
                value={prefs.reminder_time ?? "20:00"}
                onChange={handleTimeChange}
                disabled={saving}
                className="mt-1 text-xs text-rose-500 font-medium bg-transparent outline-none border-b border-rose-200"
              />
            )}
          </div>
          {/* Toggle */}
          <button
            type="button"
            onClick={toggleReminder}
            disabled={saving}
            aria-label={prefs.reminder_enabled ? "Tắt nhắc nhở" : "Bật nhắc nhở"}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              prefs.reminder_enabled ? "bg-rose-400" : "bg-gray-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                prefs.reminder_enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {prefs.reminder_enabled && (
          <p className="text-xs text-ink-soft mt-2 px-1">
            Heo sẽ nhận thông báo mỗi ngày lúc {prefs.reminder_time ?? "20:00"} nếu chưa học 🌸
          </p>
        )}
      </section>

      {/* ── Preferred topics section ─────────────────────────── */}
      <section>
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">
          Chủ đề yêu thích
        </p>
        <p className="text-xs text-ink-soft mb-3">
          Masuri sẽ chọn bài học từ những chủ đề này nhiều hơn 💕
        </p>

        <div className="flex flex-wrap gap-2">
          {ALL_TOPICS.map((topic) => {
            const active = prefs.preferred_topics.includes(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: active ? "rgba(255,201,213,0.6)" : "rgba(255,249,245,0.9)",
                  border: `1px solid ${active ? "rgba(255,150,170,0.7)" : "rgba(255,201,213,0.3)"}`,
                  color: active ? "#C4667A" : "#888",
                  transform: active ? "scale(1.03)" : "scale(1)",
                }}
              >
                <span>{topic.emoji}</span>
                <span>{topic.label}</span>
              </button>
            );
          })}
        </div>

        {prefs.preferred_topics.length === 0 && (
          <p className="text-xs text-ink-soft mt-2 px-1">
            Chưa chọn chủ đề nào — Masuri sẽ tự chọn nhé 🌸
          </p>
        )}
      </section>

      {/* ── Save status ──────────────────────────────────────── */}
      {saved && (
        <p className="text-xs text-rose-400 text-center animate-fade-in">
          Đã lưu 🌸
        </p>
      )}

      {/* ── Tour guide reset ─────────────────────────────────── */}
      <section className="pt-2 border-t border-rose-100">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-3">
          Hướng dẫn
        </p>
        <button
          type="button"
          onClick={() => {
            try { localStorage.removeItem(TOUR_LS_KEY); } catch { /* ignore */ }
            router.push("/heo/notebook");
          }}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-purple-600 active:scale-95 transition-transform"
          style={{
            backgroundColor: "rgba(196,168,220,0.15)",
            border: "1px solid rgba(196,168,220,0.4)",
          }}
        >
          🗺️ Xem lại hướng dẫn tính năng
        </button>
      </section>
    </div>
  );
}
