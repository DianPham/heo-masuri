"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { LogOut, Trash2, Bell, Globe, MoreHorizontal } from "lucide-react";

interface SettingsPageProps {
  who: "heo" | "masuri";
}

function SectionLabel({
  icon: Icon,
  label,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Icon size={14} className={danger ? "text-rose-500" : "text-ink-soft"} />
      <span
        className={[
          "font-body text-xs font-bold uppercase tracking-widest",
          danger ? "text-rose-500" : "text-ink-soft",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-rose-100 rounded-3xl overflow-hidden divide-y divide-rose-200/70"
      style={{ boxShadow: "0 4px 24px -8px rgba(168,50,79,0.13)" }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-5 gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-body text-base font-medium text-ink leading-snug">{label}</p>
        {sublabel && (
          <p className="font-body text-sm text-ink-soft mt-1 leading-snug">{sublabel}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Soon() {
  return (
    <span className="shrink-0 font-body text-[11px] text-ink-soft/40 bg-rose-200/40 px-2.5 py-1 rounded-full">
      CP8
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
    <div className="px-6 pb-28 max-w-md mx-auto">

      {/* ── Heading ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="pt-16 pb-10"
      >
        <h1
          className="font-display text-4xl text-ink italic"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          {locale === "vi" ? "Cài đặt" : "Settings"}
        </h1>
      </motion.div>

      <div className="space-y-10">

        {/* ── Thông báo ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          <SectionLabel icon={Bell} label={t("notifications")} />
          <Card>
            <Row
              label={t("missing")}
              sublabel={who === "heo" ? t("missingSubLabel") : undefined}
            >
              <Soon />
            </Row>
            <Row label={t("thinkingHugKiss")}>
              <Soon />
            </Row>
            {who === "masuri" && (
              <Row label={t("angryBuzz")}>
                <Soon />
              </Row>
            )}
            <Row label={t("quietHours")} sublabel="23:00 – 07:00">
              <Soon />
            </Row>
          </Card>
        </motion.div>

        {/* ── Ngôn ngữ ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          <SectionLabel icon={Globe} label={t("language")} />
          <Card>
            <div className="flex items-center justify-between px-6 py-5 gap-4">
              <p className="font-body text-base font-medium text-ink">
                {locale === "vi" ? "Tiếng Việt" : "English"}
              </p>
              <LanguageToggle />
            </div>
          </Card>
        </motion.div>

        {/* ── Khác ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          <SectionLabel icon={MoreHorizontal} label={t("other")} />
          <Card>
            <button
              onClick={clearWhoAndLeave}
              className="w-full flex items-center gap-4 px-6 py-5 text-left
                         hover:bg-rose-200/50 active:bg-rose-200/80 transition-colors duration-150"
            >
              <LogOut size={18} className="text-ink-soft shrink-0" />
              <span className="font-body text-base font-medium text-ink">
                {t("notMe")}
              </span>
            </button>
          </Card>
        </motion.div>

        {/* ── Vùng nguy hiểm ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          <SectionLabel icon={Trash2} label={t("dangerZone")} danger />
          <Card>
            <Row label={t("deleteAll")} sublabel={t("deleteConfirmPrompt")}>
              <Soon />
            </Row>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
