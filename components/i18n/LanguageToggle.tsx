"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";

const LANG_MAX_AGE = 60 * 60 * 24 * 365 * 10; // 10 years

export function LanguageToggle() {
  const locale = useLocale();
  const t = useTranslations("settings");

  function setLang(lang: "vi" | "en") {
    if (lang === locale) return;
    document.cookie = `lang=${lang}; path=/; max-age=${LANG_MAX_AGE}; samesite=lax`;
    // Hard reload so next-intl re-reads the cookie on the next server request
    window.location.reload();
  }

  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Language">
      {(["vi", "en"] as const).map((lang) => {
        const active = locale === lang;
        return (
          <motion.button
            key={lang}
            onClick={() => setLang(lang)}
            whileTap={{ scale: 0.95 }}
            aria-checked={active}
            role="radio"
            className={[
              "px-5 py-2 rounded-full text-sm font-body font-semibold transition-colors duration-200 cursor-pointer outline-none",
              "focus-visible:ring-2 focus-visible:ring-rose-400",
              active
                ? "bg-rose-400 text-white"
                : "bg-rose-100 text-ink-soft hover:bg-rose-200",
            ].join(" ")}
          >
            {lang === "vi" ? t("vietnamese") : t("english")}
          </motion.button>
        );
      })}
    </div>
  );
}
