"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

type NeedType = "space" | "presence" | "vent" | "fix";

const NEED_EMOJI: Record<NeedType, string> = {
  space:    "🌿",
  presence: "🫂",
  vent:     "💬",
  fix:      "🔧",
};

export function AngryForm() {
  const t = useTranslations("angry");
  const router = useRouter();

  const needs: { type: NeedType; label: string }[] = [
    { type: "space",    label: t("needSpace") },
    { type: "presence", label: t("needPresence") },
    { type: "vent",     label: t("needVent") },
    { type: "fix",      label: t("needFix") },
  ];

  const [selected, setSelected]     = useState<NeedType | null>(null);
  const [context, setContext]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/signal/angry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ need_type: selected, context_note: context.trim() || null }),
      });
      const data = await res.json();
      if (res.status === 409) {
        router.push(`/heo/angry/${data.active_buzz_id}`);
        return;
      }
      if (!res.ok) throw new Error();
      router.push(`/heo/angry/${data.id}`);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-96px)] px-5 pt-8 pb-10">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1
          className="font-display text-3xl text-ink italic"
          style={{ fontVariationSettings: "'opsz' 48" }}
        >
          {t("title")}
        </h1>
        <p className="font-accent text-base text-ink-soft mt-1">{t("subtitle")}</p>
      </div>

      {/* ── Need cards ── */}
      <div className="flex flex-col gap-2.5 mb-6">
        {needs.map(({ type, label }) => (
          <motion.button
            key={type}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(type)}
            className={[
              "w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-200",
              selected === type
                ? "bg-rose-100 border-rose-400"
                : "bg-white/50 border-rose-200/50 hover:bg-rose-50 hover:border-rose-300",
            ].join(" ")}
            style={
              selected === type
                ? { boxShadow: "0 4px 16px -6px rgba(168,50,79,0.22)" }
                : {}
            }
          >
            <span className="text-xl shrink-0">{NEED_EMOJI[type]}</span>
            <span
              className={[
                "font-accent text-base text-left leading-snug",
                selected === type ? "text-ink" : "text-ink-soft",
              ].join(" ")}
            >
              {label}
            </span>
            {selected === type && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto text-rose-400 shrink-0"
              >
                ✓
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>

      {/* ── Context note ── */}
      <div className="flex flex-col gap-2 mb-6">
        <label className="font-accent text-sm text-ink-soft/60">
          {t("contextLabel")}
        </label>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={3}
          placeholder={t("contextPlaceholder")}
          className="font-accent text-base text-ink bg-white/50 border-2 border-rose-200/50 rounded-2xl px-4 py-3
                     placeholder:text-ink-soft/30 focus:outline-none focus:border-rose-300 transition-colors resize-none"
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 mt-auto pt-2">
        <button
          onClick={() => router.back()}
          className="flex-1 py-4 rounded-2xl border-2 border-rose-200/70 font-accent text-base text-ink-soft
                     hover:bg-rose-100 hover:border-rose-300 transition-all duration-150"
        >
          {t("back")}
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={!selected || submitting}
          onClick={handleSubmit}
          className="flex-1 py-4 rounded-2xl bg-rose-400 text-white font-accent text-base font-semibold
                     disabled:opacity-40 hover:bg-rose-500 active:bg-rose-600 transition-colors duration-150"
          style={
            selected && !submitting
              ? { boxShadow: "0 8px 24px -8px rgba(168,50,79,0.40)" }
              : {}
          }
        >
          {submitting ? "..." : t("submit")}
        </motion.button>
      </div>

    </div>
  );
}
