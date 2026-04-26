"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Pig } from "@/components/theme/Pig";

interface CountdownProps {
  daysLeft: number;
  label: string;
  labelEn: string | null;
  progressPercent: number;
  who: "heo" | "masuri";
}

export function Countdown({ daysLeft, label, labelEn, progressPercent, who }: CountdownProps) {
  const t = useTranslations("countdown");
  const locale = useLocale();
  const displayLabel = locale === "en" && labelEn ? labelEn : label;

  const isToday = daysLeft === 0;
  const isPast = daysLeft < 0;

  if (isPast && who === "masuri") {
    return (
      <p className="font-body text-sm text-ink-soft/60 text-center">{t("passed")}</p>
    );
  }

  if (isPast) return null;

  if (isToday) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Pig pose="sparkle" size={72} animate={false} />
        <p
          className="font-display text-2xl text-rose-500 italic"
          style={{ fontVariationSettings: "'opsz' 36" }}
        >
          {t("today")}
        </p>
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(100, progressPercent));

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <motion.p
        key={daysLeft}
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="font-display italic text-ink leading-none"
        style={{ fontSize: "clamp(80px, 22vw, 120px)", fontVariationSettings: "'opsz' 144" }}
      >
        {daysLeft}
      </motion.p>

      <p className="font-body text-sm text-ink-soft text-center leading-snug px-4">
        {t("daysLeft")} · {displayLabel}
      </p>

      {clamped > 0 && clamped < 100 && (
        <div className="w-full max-w-[200px] mt-1">
          <div className="h-0.5 bg-rose-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-rose-300 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${clamped}%` }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 }}
            />
          </div>
          <p className="font-body text-[10px] text-ink-soft/40 text-right mt-0.5">
            {t("progressLabel", { percent: clamped })}
          </p>
        </div>
      )}
    </div>
  );
}
