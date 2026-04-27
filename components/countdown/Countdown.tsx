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
  const isPast  = daysLeft < 0;

  if (isPast && who === "masuri") {
    return (
      <p className="font-body text-sm text-ink-soft/60 text-center">{t("passed")}</p>
    );
  }

  if (isPast) return null;

  if (isToday) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="flex flex-col items-center gap-4 text-center py-4"
      >
        <Pig pose="sparkle" size={80} animate={false} />
        <p className="font-accent text-2xl text-rose-500">
          {t("today")}
        </p>
      </motion.div>
    );
  }

  const clamped = Math.max(0, Math.min(100, progressPercent));

  return (
    <motion.div
      key={daysLeft}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="relative w-full max-w-[340px] rounded-[28px] px-7 py-7 overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #FFE4EA 0%, #FFF0F5 60%, #FFF5F7 100%)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Decorative background heart */}
      <div className="absolute -top-3 -right-3 pointer-events-none" aria-hidden>
        <svg width={96} height={96} viewBox="0 0 24 24" fill="#D14D6F" opacity={0.07}>
          <path d="M12 21.593C12 21.593 2 14.5 2 7.5C2 4.462 4.462 2 7.5 2C9.36 2 11 3.073 12 4.5C13 3.073 14.64 2 16.5 2C19.538 2 22 4.462 22 7.5C22 14.5 12 21.593 12 21.593Z" />
        </svg>
      </div>

      {/* Event name — Caveat gives it a handwritten, personal feel */}
      <p className="font-accent text-rose-400 text-lg leading-none mb-2 relative z-10">
        {displayLabel}
      </p>

      {/* Number + "days left" */}
      <div className="flex items-baseline gap-2.5 relative z-10">
        <span
          className="font-display italic text-ink leading-none"
          style={{ fontSize: "clamp(72px, 20vw, 100px)", fontVariationSettings: "'opsz' 144" }}
        >
          {daysLeft}
        </span>
        <span className="font-accent text-base text-ink-soft/70 leading-none mb-1">
          {t("daysLeft")}
        </span>
      </div>

      {/* Progress bar */}
      {clamped > 0 && clamped < 100 && (
        <div className="mt-5 relative z-10">
          <div className="h-2 bg-rose-200/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #F8A8BC, #D14D6F)" }}
              initial={{ width: 0 }}
              animate={{ width: `${clamped}%` }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.5 }}
            />
          </div>
          <p className="font-accent text-xs text-ink-soft/45 mt-1.5 text-right">
            {t("progressLabel", { percent: clamped })}
          </p>
        </div>
      )}
    </motion.div>
  );
}
