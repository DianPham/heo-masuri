"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

type NeedType = "space" | "presence" | "vent" | "fix";

export function AngryForm() {
  const t = useTranslations("angry");
  const router = useRouter();

  const needs: { type: NeedType; label: string }[] = [
    { type: "space",    label: t("needSpace") },
    { type: "presence", label: t("needPresence") },
    { type: "vent",     label: t("needVent") },
    { type: "fix",      label: t("needFix") },
  ];

  const [selected, setSelected]   = useState<NeedType | null>(null);
  const [context, setContext]     = useState("");
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
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      router.push(`/heo/angry/${id}`);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-96px)] px-6 pt-10 pb-10">
      <div className="space-y-1 mb-8">
        <h1
          className="font-display text-3xl text-ink italic"
          style={{ fontVariationSettings: "'opsz' 48" }}
        >
          {t("title")}
        </h1>
        <p className="font-body text-sm text-ink-soft">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {needs.map(({ type, label }) => (
          <motion.button
            key={type}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(type)}
            className={[
              "w-full text-left px-5 py-4 rounded-2xl border transition-colors duration-150 font-body text-sm font-medium",
              selected === type
                ? "bg-rose-200/80 border-rose-400 text-ink"
                : "bg-rose-100 border-rose-200/60 text-ink-soft hover:bg-rose-100/80",
            ].join(" ")}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <div className="flex flex-col gap-2 mb-8">
        <label className="font-body text-xs text-ink-soft/60 uppercase tracking-wider">
          {t("contextPlaceholder")}
        </label>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={3}
          placeholder="..."
          className="font-body text-sm text-ink bg-rose-100 border border-rose-200/60 rounded-xl px-4 py-3
                     placeholder:text-ink-soft/30 focus:outline-none focus:border-rose-400 transition-colors resize-none"
        />
      </div>

      <div className="flex gap-3 mt-auto">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3.5 rounded-2xl border border-rose-200 font-body text-sm text-ink-soft
                     hover:bg-rose-100 transition-colors duration-150"
        >
          {t("back")}
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={!selected || submitting}
          onClick={handleSubmit}
          className="flex-1 py-3.5 rounded-2xl bg-rose-400 text-white font-body font-semibold text-sm
                     disabled:opacity-50 hover:bg-rose-500 transition-colors duration-150"
        >
          {submitting ? "..." : t("submit")}
        </motion.button>
      </div>
    </div>
  );
}
