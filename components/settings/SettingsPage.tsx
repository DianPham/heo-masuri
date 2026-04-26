"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { LogOut, Trash2, Bell, Globe, MoreHorizontal } from "lucide-react";

interface SettingsPageProps {
  who: "heo" | "masuri";
}

// ── Section wrapper ──────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  children,
  danger,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Icon
          size={15}
          className={danger ? "text-rose-500" : "text-ink-soft"}
        />
        <h2
          className={[
            "font-body text-xs font-semibold uppercase tracking-widest",
            danger ? "text-rose-500" : "text-ink-soft",
          ].join(" ")}
        >
          {title}
        </h2>
      </div>
      <div
        className="bg-rose-100 rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 2px 12px -4px rgba(168,50,79,0.10)" }}
      >
        {children}
      </div>
    </motion.section>
  );
}

// ── Single row inside a section ──────────────────────────────
function Row({
  label,
  sublabel,
  children,
  divider = true,
}: {
  label: string;
  sublabel?: string;
  children?: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between px-4 py-3.5 gap-3",
        divider ? "border-b border-rose-200/60 last:border-0" : "",
      ].join(" ")}
    >
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-ink truncate">{label}</p>
        {sublabel && (
          <p className="font-body text-xs text-ink-soft mt-0.5">{sublabel}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Stub badge ───────────────────────────────────────────────
function ComingSoon({ label = "Checkpoint 8" }: { label?: string }) {
  return (
    <span className="font-body text-[10px] text-ink-soft/50 bg-rose-200/40 px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}

// ── Main settings page ───────────────────────────────────────
export function SettingsPage({ who }: SettingsPageProps) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();

  function clearWhoAndLeave() {
    // Clear the soft-gate cookie
    document.cookie = "who=; path=/; max-age=0; samesite=lax";
    router.push("/");
    router.refresh();
  }

  return (
    <div className="px-5 pt-10 pb-24 space-y-6 max-w-md mx-auto">
      {/* Page title */}
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-3xl text-ink italic"
        style={{ fontVariationSettings: "'opsz' 60" }}
      >
        {locale === "vi" ? "Cài đặt" : "Settings"}
      </motion.h1>

      {/* ── Thông báo / Notifications ── (stub until Checkpoint 8) */}
      <Section icon={Bell} title={t("notifications")} delay={0.05}>
        <Row
          label={t("missing")}
          sublabel={who === "heo" ? t("missingSubLabel") : undefined}
        >
          <ComingSoon />
        </Row>
        <Row label={t("thinkingHugKiss")}>
          <ComingSoon />
        </Row>
        {who === "masuri" && (
          <Row label={t("angryBuzz")}>
            <ComingSoon />
          </Row>
        )}
        <Row label={t("quietHours")} sublabel="23:00 – 07:00" divider={false}>
          <ComingSoon />
        </Row>
      </Section>

      {/* ── Ngôn ngữ / Language ── (fully functional at Checkpoint 2) */}
      <Section icon={Globe} title={t("language")} delay={0.1}>
        <div className="flex justify-center px-4 py-4">
          <LanguageToggle />
        </div>
      </Section>

      {/* ── Khác / Other ── */}
      <Section icon={MoreHorizontal} title={t("other")} delay={0.15}>
        <button
          onClick={clearWhoAndLeave}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left
                     hover:bg-rose-200/50 active:bg-rose-200 transition-colors duration-150"
        >
          <LogOut size={16} className="text-ink-soft shrink-0" />
          <span className="font-body text-sm font-medium text-ink">
            {t("notMe")}
          </span>
        </button>
      </Section>

      {/* ── Vùng nguy hiểm / Danger zone ── (stub until Checkpoint 8) */}
      <Section icon={Trash2} title={t("dangerZone")} danger delay={0.2}>
        <Row
          label={t("deleteAll")}
          sublabel={t("deleteConfirmPrompt")}
          divider={false}
        >
          <ComingSoon />
        </Row>
      </Section>
    </div>
  );
}
