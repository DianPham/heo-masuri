"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface ReunionFormProps {
  current: { label: string; label_en: string | null; target_date: string } | null;
}

export function ReunionForm({ current }: ReunionFormProps) {
  const t = useTranslations("reunion");
  const router = useRouter();
  const [label, setLabel]         = useState(current?.label ?? "");
  const [labelEn, setLabelEn]     = useState(current?.label_en ?? "");
  const [targetDate, setTargetDate] = useState(current?.target_date ?? "");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [deleting, setDeleting]   = useState(false);

  async function handleDelete() {
    if (!confirm("Xóa countdown này?")) return;
    setDeleting(true);
    try {
      await fetch("/api/reunion", { method: "DELETE" });
      router.push("/masuri");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !targetDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reunion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          label_en: labelEn.trim() || null,
          target_date: targetDate,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => {
        router.push("/masuri");
        router.refresh();
      }, 1200);
    } catch {
      setSaving(false);
    }
  }

  const inputClass =
    "font-body text-sm text-ink bg-rose-100 border border-rose-200/60 rounded-xl px-4 py-3 w-full " +
    "placeholder:text-ink-soft/40 focus:outline-none focus:border-rose-400 transition-colors";

  const labelClass = "font-body text-xs font-medium text-ink-soft uppercase tracking-wider";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>{t("label")}</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Heo về thăm Masuri"
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>{t("labelEn")}</label>
        <input
          type="text"
          value={labelEn}
          onChange={e => setLabelEn(e.target.value)}
          placeholder="Heo visits Masuri"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>{t("targetDate")}</label>
        <input
          type="date"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <motion.button
        type="submit"
        disabled={saving || saved || !label.trim() || !targetDate}
        whileTap={{ scale: 0.97 }}
        className="mt-2 py-3.5 rounded-2xl bg-rose-400 text-white font-body font-semibold text-sm
                   disabled:opacity-50 hover:bg-rose-500 active:bg-rose-600 transition-colors duration-150"
      >
        {saved ? "✓ " + t("save") : saving ? "..." : t("save")}
      </motion.button>

      {current && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="font-body text-xs text-ink-soft/50 hover:text-rose-500 transition-colors disabled:opacity-40 text-center"
        >
          {deleting ? "..." : "Xóa countdown"}
        </button>
      )}

    </form>
  );
}
