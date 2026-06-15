"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { Pig } from "@/components/theme/Pig";
import { Bell, Globe, MoreHorizontal, AlertTriangle, ChevronRight, Check } from "lucide-react";

interface SettingsPageProps {
  who: "heo" | "masuri";
}

interface Prefs {
  missing_enabled: boolean;
  thinking_enabled: boolean;
  hug_kiss_enabled: boolean;
  angry_enabled: boolean;
  // Phase 2 additions (migration 010)
  surprise_enabled?: boolean;
  gmgn_enabled?: boolean;
  date_planning_enabled?: boolean;
  outfit_enabled?: boolean;
  important_date_enabled?: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
}

// ── Section header — now uses font-accent for warmth ─────────
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
    <div className="flex items-center gap-2 px-1 pb-2.5">
      <Icon
        size={12}
        style={{ color: danger ? "var(--color-accent)" : "var(--color-ink-mute)" }}
      />
      <span
        className="section-eyebrow"
        style={danger ? { color: "var(--color-accent)" } : undefined}
      >
        {label}
      </span>
    </div>
  );
}

// ── Row group — refined surface card with ink-tone divider ──
function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#ffffff",
        border: "1px solid var(--color-hairline)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="divide-y" style={{ borderColor: "var(--color-hairline)" }}>
        {children}
      </div>
    </div>
  );
}

// ── Static row (label + right slot) ─────────────────────────
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
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex-1 min-w-0">
        <p
          className="text-[14.5px] font-medium leading-snug"
          style={{ color: danger ? "var(--color-accent)" : "var(--color-ink)" }}
        >
          {label}
        </p>
        {sublabel && (
          <p
            className="text-[12px] mt-0.5 leading-snug"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {sublabel}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Tappable row ─────────────────────────────────────────────
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
      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[rgba(58,33,41,0.025)]"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-medium leading-snug" style={{ color: "var(--color-ink)" }}>
          {label}
        </p>
        {sublabel && (
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--color-ink-mute)" }}>
            {sublabel}
          </p>
        )}
      </div>
      {children ?? <ChevronRight size={14} style={{ color: "var(--color-ink-mute)" }} className="shrink-0" />}
    </button>
  );
}

// ── Toggle switch ────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="relative inline-flex w-[42px] h-[26px] rounded-full transition-colors duration-200 shrink-0 focus-visible:outline-none"
      style={{
        background: checked ? "var(--color-accent)" : "rgba(58,33,41,0.18)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-[3px] w-5 h-5 bg-white rounded-full"
        style={{
          left: checked ? 19 : 3,
          boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
        }}
      />
    </button>
  );
}

function ToggleSkeleton() {
  return (
    <div
      className="w-[42px] h-[26px] rounded-full animate-pulse shrink-0"
      style={{ background: "rgba(58,33,41,0.08)" }}
    />
  );
}

// ── Main ─────────────────────────────────────────────────────
export function SettingsPage({ who }: SettingsPageProps) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();

  const [prefs, setPrefs]               = useState<Prefs | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [saved, setSaved]               = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput]         = useState("");
  const [deleting, setDeleting]               = useState(false);
  const [wiped, setWiped]                     = useState(false);

  useEffect(() => {
    fetch("/api/prefs")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setPrefs(data);
        setPrefsLoading(false);
      })
      .catch(() => setPrefsLoading(false));
  }, []);

  const flashSaved = useCallback(() => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  const updatePref = useCallback(
    async (updates: Partial<Prefs>) => {
      setPrefs((prev) => (prev ? { ...prev, ...updates } : prev));
      const res = await fetch("/api/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) flashSaved();
    },
    [flashSaved]
  );

  function clearWhoAndLeave() {
    document.cookie = "who=; path=/; max-age=0; samesite=lax";
    router.push("/");
    router.refresh();
  }

  const confirmWord = locale === "vi" ? "XÓA HẾT" : "DELETE-EVERYTHING";

  async function handleWipe() {
    if (deleteInput !== confirmWord) return;
    setDeleting(true);
    const res = await fetch("/api/admin/wipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: deleteInput }),
    });
    if (res.ok) {
      setWiped(true);
      setShowDeleteModal(false);
    }
    setDeleting(false);
  }

  // ── Post-wipe screen ──────────────────────────────────────
  if (wiped) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-8 text-center gap-6"
        style={{ background: "linear-gradient(160deg, #FFF9F5 0%, #FFF5F7 100%)" }}
      >
        <Pig pose="sleepy" size={120} />
        <div className="space-y-2">
          <p
            className="font-display text-2xl text-ink italic"
            style={{ fontVariationSettings: "'opsz' 60" }}
          >
            {t("deleteSuccess")}
          </p>
          <p className="font-accent text-base text-ink-soft">
            {locale === "vi" ? "Mọi thứ đã được xóa sạch" : "Everything has been cleared"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-cream)" }}>
      <div className="max-w-[420px] lg:max-w-[640px] mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="px-6 pt-12 pb-8 relative"
        >
          <div className="flex items-start justify-between mb-2">
            <p className="section-eyebrow">{t("account")}</p>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "#ffffff",
                border: "1px solid var(--color-hairline)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Pig pose="neutral" size={24} animate={false} />
            </div>
          </div>

          <div className="flex items-end justify-between">
            <h1
              className="font-display text-[36px] leading-[1.05] tracking-[-0.02em]"
              style={{ color: "var(--color-ink)", fontWeight: 500 }}
            >
              {locale === "vi" ? "Cài đặt" : "Settings"}
            </h1>

            <AnimatePresence>
              {saved && (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full mb-1.5 font-medium"
                  style={{ color: "#5C7A4A", background: "rgba(156,175,136,0.16)" }}
                >
                  <Check size={11} />
                  {t("saved")}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Sections ── */}
        <div className="px-5 space-y-7">

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
                {prefsLoading ? <ToggleSkeleton /> : (
                  <Toggle
                    checked={prefs?.missing_enabled ?? true}
                    onChange={(v) => updatePref({ missing_enabled: v })}
                  />
                )}
              </Row>

              <Row label={t("thinkingHugKiss")}>
                {prefsLoading ? <ToggleSkeleton /> : (
                  <Toggle
                    checked={prefs?.thinking_enabled ?? true}
                    onChange={(v) => updatePref({ thinking_enabled: v, hug_kiss_enabled: v })}
                  />
                )}
              </Row>

              {who === "masuri" && (
                <Row label={t("angryBuzz")}>
                  {prefsLoading ? <ToggleSkeleton /> : (
                    <Toggle
                      checked={prefs?.angry_enabled ?? true}
                      onChange={(v) => updatePref({ angry_enabled: v })}
                    />
                  )}
                </Row>
              )}

              {/* Phase 2 prefs (blueprint §8.3) */}
              <Row label={t("surpriseDrops")} sublabel={t("surpriseDropsSub")}>
                {prefsLoading ? <ToggleSkeleton /> : (
                  <Toggle
                    checked={prefs?.surprise_enabled ?? true}
                    onChange={(v) => updatePref({ surprise_enabled: v })}
                  />
                )}
              </Row>
              <Row label={t("gmgn")} sublabel={t("gmgnSub")}>
                {prefsLoading ? <ToggleSkeleton /> : (
                  <Toggle
                    checked={prefs?.gmgn_enabled ?? true}
                    onChange={(v) => updatePref({ gmgn_enabled: v })}
                  />
                )}
              </Row>
              <Row label={t("datePlanning")} sublabel={t("datePlanningSub")}>
                {prefsLoading ? <ToggleSkeleton /> : (
                  <Toggle
                    checked={prefs?.date_planning_enabled ?? true}
                    onChange={(v) => updatePref({ date_planning_enabled: v })}
                  />
                )}
              </Row>
              <Row label={t("outfitSuggestions")} sublabel={t("outfitSuggestionsSub")}>
                {prefsLoading ? <ToggleSkeleton /> : (
                  <Toggle
                    checked={prefs?.outfit_enabled ?? true}
                    onChange={(v) => updatePref({ outfit_enabled: v })}
                  />
                )}
              </Row>
              <Row label={t("importantDates")} sublabel={t("importantDatesSub")}>
                {prefsLoading ? <ToggleSkeleton /> : (
                  <Toggle
                    checked={prefs?.important_date_enabled ?? true}
                    onChange={(v) => updatePref({ important_date_enabled: v })}
                  />
                )}
              </Row>

              {/* Quiet hours */}
              <div className="px-5 py-4">
                <p className="text-[14.5px] font-medium leading-snug mb-2.5" style={{ color: "var(--color-ink)" }}>
                  {t("quietHours")}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-[12px]" style={{ color: "var(--color-ink-mute)" }}>
                  <span>{t("quietFrom")}</span>
                  <input
                    key={`qs-${prefs?.quiet_start}`}
                    type="time"
                    defaultValue={prefs?.quiet_start ?? "23:00"}
                    onBlur={(e) => updatePref({ quiet_start: e.target.value })}
                    disabled={prefsLoading}
                    className="input-base"
                    style={{ width: "auto", padding: "0.375rem 0.625rem", fontSize: "0.8125rem" }}
                  />
                  <span>{t("quietTo")}</span>
                  <input
                    key={`qe-${prefs?.quiet_end}`}
                    type="time"
                    defaultValue={prefs?.quiet_end ?? "07:00"}
                    onBlur={(e) => updatePref({ quiet_end: e.target.value })}
                    disabled={prefsLoading}
                    className="input-base"
                    style={{ width: "auto", padding: "0.375rem 0.625rem", fontSize: "0.8125rem" }}
                  />
                </div>
              </div>
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
                sublabel={
                  locale === "vi"
                    ? "Đăng xuất và quay về trang chủ"
                    : "Sign out and return to home"
                }
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
              <TappableRow
                label={t("deleteAll")}
                sublabel={t("deleteConfirmPrompt")}
                onClick={() => setShowDeleteModal(true)}
              >
                <AlertTriangle size={15} className="text-rose-400/70 shrink-0" />
              </TappableRow>
            </RowGroup>
          </motion.div>

        </div>
      </div>

      {/* ── Delete confirmation sheet ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/25 backdrop-blur-sm z-40"
              onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }}
            />
            <motion.div
              key="sheet"
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 48 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-50 px-5 pb-10 pt-2"
            >
              <div
                className="max-w-[420px] mx-auto rounded-2xl p-6"
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--color-hairline)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <Pig pose="sad" size={72} animate={false} />

                  <div className="space-y-1">
                    <h2
                      className="font-display text-[22px] tracking-tight"
                      style={{ color: "var(--color-ink)", fontWeight: 500 }}
                    >
                      {t("deleteAll")}
                    </h2>
                    <p className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                      {t("deleteConfirmPrompt")}
                    </p>
                  </div>

                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={confirmWord}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="input-base text-center tracking-wider"
                    style={{ padding: "0.75rem 1rem" }}
                  />

                  <div className="flex gap-2.5 w-full">
                    <button
                      onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }}
                      className="btn-ghost flex-1 py-3"
                    >
                      {t("deleteCancel")}
                    </button>
                    <button
                      onClick={handleWipe}
                      disabled={deleteInput !== confirmWord || deleting}
                      className="btn-primary flex-1 py-3"
                      style={
                        deleteInput !== confirmWord || deleting
                          ? { background: "rgba(58,33,41,0.12)", color: "var(--color-ink-mute)" }
                          : undefined
                      }
                    >
                      {deleting ? "…" : t("deleteConfirmButton")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
