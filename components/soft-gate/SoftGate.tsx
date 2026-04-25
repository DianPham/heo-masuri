"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Pig } from "@/components/theme/Pig";

function setWhoCookieClient(who: "heo" | "masuri") {
  const maxAge = 60 * 60 * 24 * 365 * 10;
  document.cookie = `who=${who}; path=/; max-age=${maxAge}; samesite=lax`;
}

interface PortraitProps {
  label: string;
  sublabel?: string;
  delay?: number;
  onClick: () => void;
  children: React.ReactNode;
}

function Portrait({ label, delay = 0, onClick, children }: PortraitProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col items-center gap-4 cursor-pointer group outline-none"
    >
      <div
        className="w-32 h-32 rounded-full flex items-center justify-center
                   bg-rose-100 group-hover:bg-rose-200 transition-colors duration-200"
        style={{ boxShadow: "0 8px 32px -8px rgba(168, 50, 79, 0.22)" }}
      >
        {children}
      </div>
      <span
        className="font-display text-xl font-semibold text-ink italic tracking-wide"
        style={{ fontVariationSettings: "'opsz' 60" }}
      >
        {label}
      </span>
    </motion.button>
  );
}

export function SoftGate() {
  const t = useTranslations("softGate");
  const router = useRouter();

  function choose(who: "heo" | "masuri") {
    setWhoCookieClient(who);
    router.push(who === "heo" ? "/heo" : "/masuri");
  }

  return (
    <main className="min-h-dvh bg-cream flex flex-col items-center justify-center px-6 py-16 gap-12">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-center space-y-2"
      >
        <h1
          className="font-display text-4xl font-semibold text-ink italic"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          {t("title")}
        </h1>
        <p className="font-body text-ink-soft text-base">{t("subtitle")}</p>
      </motion.div>

      <div className="flex gap-12 items-end">
        {/* Heo — pig portrait */}
        <Portrait label={t("heo")} delay={0.1} onClick={() => choose("heo")}>
          <Pig pose="neutral" size={88} animate={false} />
        </Portrait>

        {/* Masuri — monogram */}
        <Portrait label={t("masuri")} delay={0.2} onClick={() => choose("masuri")}>
          <span
            className="font-display text-5xl text-rose-500 italic select-none"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            M
          </span>
        </Portrait>
      </div>
    </main>
  );
}
