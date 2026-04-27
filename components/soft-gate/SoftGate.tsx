"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Pig } from "@/components/theme/Pig";

function setWhoCookieClient(who: "heo" | "masuri") {
  const maxAge = 60 * 60 * 24 * 365 * 10; // 10 years
  document.cookie = `who=${who}; path=/; max-age=${maxAge}; samesite=lax`;
}

// ── Portrait card ────────────────────────────────────────────
function Portrait({
  label,
  delay = 0,
  onClick,
  children,
}: {
  label: string;
  delay?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex flex-col items-center gap-5 cursor-pointer outline-none group"
    >
      {/* Circle frame */}
      <div
        className="w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: "linear-gradient(145deg, #FFE4EA, #FFF5F7)",
          boxShadow: "0 16px 48px -12px rgba(168, 50, 79, 0.26)",
        }}
      >
        <motion.div
          whileHover={{ scale: 1.06 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {children}
        </motion.div>
      </div>

      {/* Name label */}
      <motion.span
        className="font-accent text-xl text-ink"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.15, duration: 0.4 }}
      >
        {label}
      </motion.span>
    </motion.button>
  );
}

// ── Decorative background hearts ─────────────────────────────
function BgHearts() {
  const hearts = [
    { x: "8%",  y: "12%", size: 14, opacity: 0.12, delay: 0 },
    { x: "88%", y: "8%",  size: 10, opacity: 0.10, delay: 0.6 },
    { x: "5%",  y: "75%", size: 12, opacity: 0.09, delay: 1.2 },
    { x: "91%", y: "70%", size: 16, opacity: 0.11, delay: 0.3 },
    { x: "50%", y: "6%",  size: 9,  opacity: 0.08, delay: 0.9 },
  ];

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((h, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: h.x, top: h.y }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: h.opacity, y: [0, -6, 0] }}
          transition={{
            opacity: { delay: h.delay + 0.5, duration: 0.8 },
            y: { delay: h.delay, duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          {/* Inline SVG heart to avoid importing Heart component (keeps this file self-contained) */}
          <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill="#D14D6F">
            <path d="M12 21.593C12 21.593 2 14.5 2 7.5C2 4.462 4.462 2 7.5 2C9.36 2 11 3.073 12 4.5C13 3.073 14.64 2 16.5 2C19.538 2 22 4.462 22 7.5C22 14.5 12 21.593 12 21.593Z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export function SoftGate() {
  const t = useTranslations("softGate");
  const router = useRouter();

  function choose(who: "heo" | "masuri") {
    setWhoCookieClient(who);
    router.push(who === "heo" ? "/heo" : "/masuri");
  }

  return (
    <main
      className="relative min-h-dvh flex flex-col items-center justify-center
                 px-8 py-16 gap-14 overflow-hidden"
      style={{ background: "linear-gradient(160deg, #FFF9F5 0%, #FFF0F5 100%)" }}
    >
      <BgHearts />

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-2 relative z-10"
      >
        <h1
          className="font-display text-5xl text-ink italic"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          {t("title")}
        </h1>
        <p className="font-accent text-base text-ink-soft/70">
          {t("subtitle")}
        </p>
      </motion.div>

      {/* Portraits */}
      <div className="flex items-center gap-10 relative z-10">
        <Portrait label={t("heo")} delay={0.1} onClick={() => choose("heo")}>
          <Pig pose="neutral" size={96} />
        </Portrait>

        <Portrait label={t("masuri")} delay={0.22} onClick={() => choose("masuri")}>
          {/* Monogram "M" in Fraunces italic */}
          <span
            className="font-display text-6xl text-rose-500 italic select-none leading-none"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            M
          </span>
        </Portrait>
      </div>

      {/* Footer whisper */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="font-accent text-rose-300 text-lg relative z-10"
      >
        Heo & Masuri 🐷
      </motion.p>
    </main>
  );
}
