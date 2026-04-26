"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { Bell, Globe, MoreHorizontal, AlertTriangle, ChevronRight } from "lucide-react";

interface SettingsPageProps {
  who: "heo" | "masuri";
}

function SectionHeader({
  icon: Icon,
  label,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-1 pb-3">
      <Icon size={14} className={danger ? "text-rose-500" : "text-ink-soft"} />
      <span
        className={[
          "text-[10px] font-medium uppercase tracking-[0.16em] font-body",
          danger ? "text-rose-500" : "text-ink-soft",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-rose-200/60 bg-rose-100 divide-y divide-rose-200/70">
      {children}
    </div>
  );
}

function Row({
  label,
  sublabel,
  danger,
  children,
}: {
  label: string;
  sublabel?: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-5 gap-4">
      <div className="flex-1 min-w-0">
        <p
          className={[
            "font-body text-base font-normal leading-snug",
            danger ? "text-rose-500" : "text-ink",
          ].join(" ")}
        >
          {label}
        </p>
        {sublabel && (
          <p
            className={[
              "font-body text-sm mt-1 leading-snug",
              danger ? "text-rose-400/70" : "text-ink-soft",
            ].join(" ")}
          >
            {sublabel}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function TappableRow({
  label,
  sublabel,
  onClick,
  children,
}: {
  label: string;
  sublabel?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-5 gap-4 text-left
                 hover:bg-rose-500/5 active:bg-rose-500/10 transition-colors duration-150"
    >
      <div className="flex-1 min-w-0">
        <p className="font-body text-base font-normal text-ink leading-snug">
          {label}
        </p>
        {sublabel && (
          <p className="font-body text-sm text-ink-soft mt-1 leading-snug">
            {sublabel}
          </p>
        )}
      </div>
      {children ?? (
        <ChevronRight size={16} className="text-ink/30 shrink-0" />
      )}
    </button>
  );
}

function SoonPill() {
  return (
    <span className="shrink-0 font-body text-[10px] font-medium tracking-[0.06em] text-ink-soft/50 bg-rose-200/40 rounded-full px-2.5 py-1">
      Soon
    </span>
  );
}

export function SettingsPage({ who }: SettingsPageProps) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();

  function clearWhoAndLeave() {
    document.cookie = "who=; path=/; max-age=0; samesite=lax";
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-rose-50 pb-20">
      <div className="max-w-[390px] mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="px-7 pt-14 pb-10 border-b border-rose-200 relative"
        >
          <p className="font-body text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft mb-2.5">
            {t("account")}
          </p>
          <h1
            className="font-display text-[38px] leading-[1.1] text-ink italic tracking-[-0.01em]"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            {locale === "vi" ? "Cài đặt" : "Settings"}
          </h1>

          {/* Decorative accent */}
          <div className="absolute top-14 right-7 w-9 h-9 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
          </div>
        </motion.div>

        {/* ── Sections ── */}
        <div className="px-6 pt-6 space-y-8">

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <SectionHeader icon={Bell} label={t("notifications")} />
            <RowGroup>
              <Row
                label={t("missing")}
                sublabel={who === "heo" ? t("missingSubLabel") : undefined}
              >
                <SoonPill />
              </Row>
              <Row label={t("thinkingHugKiss")}>
                <SoonPill />
              </Row>
              {who === "masuri" && (
                <Row label={t("angryBuzz")}>
                  <SoonPill />
                </Row>
              )}
              <Row label={t("quietHours")} sublabel="23:00 – 07:00">
                <SoonPill />
              </Row>
            </RowGroup>
          </motion.div>

          {/* Language */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <SectionHeader icon={Globe} label={t("language")} />
            <RowGroup>
              <Row
                label={locale === "vi" ? "Tiếng Việt" : "English"}
                sublabel="Tiếng Việt · English"
              >
                <LanguageToggle />
              </Row>
            </RowGroup>
          </motion.div>

          {/* Other */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <SectionHeader icon={MoreHorizontal} label={t("other")} />
            <RowGroup>
              <TappableRow
                label={t("notMe")}
                sublabel={locale === "vi" ? "Đăng xuất và quay về trang chủ" : "Sign out and return to home"}
                onClick={clearWhoAndLeave}
              />
            </RowGroup>
          </motion.div>

          {/* Danger zone */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <SectionHeader icon={AlertTriangle} label={t("dangerZone")} danger />
            <RowGroup>
              <Row
                label={t("deleteAll")}
                sublabel={t("deleteConfirmPrompt")}
                danger
              >
                <SoonPill />
              </Row>
            </RowGroup>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
