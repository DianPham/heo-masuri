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
      <Icon size={13} className={danger ? "text-rose-400" : "text-rose-300"} />
      <span
        className={[
          "font-accent text-sm",
          danger ? "text-rose-400" : "text-ink-soft/70",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

// ── Row group — glass card style matching rest of app ────────
function RowGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden divide-y divide-rose-200/50"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "2px solid rgba(248,168,188,0.25)",
        boxShadow: "0 2px 16px -6px rgba(168,50,79,0.10)",
      }}
    >
      {children}
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
    <div className="flex items-center justify-between px-8 py-6 gap-4">
      <div className="flex-1 min-w-0">
        <p
          className={[
            "font-body text-[15px] font-normal leading-snug",
            danger ? "text-rose-500" : "text-ink",
          ].join(" ")}
        >
          {label}
        </p>
        {sublabel && (
          <p
            className={[
              "font-accent text-sm mt-0.5 leading-snug",
              danger ? "text-rose-400/70" : "text-ink-soft/70",
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
      className="w-full flex items-center justify-between px-8 py-6 gap-4 text-left
                 hover:bg-rose-500/5 active:bg-rose-500/8 transition-colors duration-150"
    >
      <div className="flex-1 min-w-0">
        <p className="font-body text-[15px] font-normal text-ink leading-snug">
          {label}
        </p>
        {sublabel && (
          <p className="font-accent text-sm text-ink-soft/70 mt-0.5 leading-snug">
            {sublabel}
          </p>
        )}
      </div>
      {children ?? <ChevronRight size={15} className="text-ink/25 shrink-0" />}
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
      className={[
        "relative inline-flex w-12 h-7 rounded-full transition-colors duration-200 shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1",
        checked ? "bg-rose-400" : "bg-rose-200/80",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={[
          "absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm",
          checked ? "left-6" : "left-1",
        ].join(" ")}
      />
    </button>
  );
}

function ToggleSkeleton() {
  return <div className="w-12 h-7 rounded-full bg-rose-200/50 animate-pulse shrink-0" />;
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
    <div
      className="min-h-screen pb-24"
      style={{ background: "linear-gradient(160deg, #FFF9F5 0%, #FFF5F7 100%)" }}
    >
      <div className="max-w-[420px] lg:max-w-[640px] mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="px-6 pt-12 pb-8 relative"
        >
          {/* Small pig avatar in header */}
          <div className="flex items-start justify-between mb-1">
            <p className="font-accent text-sm text-rose-300/80">
              {t("account")}
            </p>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(145deg, #FFE4EA, #FFF5F7)",
                boxShadow: "var(--shadow-lift)",
              }}
            >
              <Pig pose="neutral" size={28} animate={false} />
            </div>
          </div>

          <div className="flex items-end justify-between">
            <h1
              className="font-display text-[40px] leading-[1.05] text-ink italic tracking-[-0.01em]"
              style={{ fontVariationSettings: "'opsz' 72" }}
            >
              {locale === "vi" ? "Cài đặt" : "Settings"}
            </h1>

            {/* Saved badge */}
            <AnimatePresence>
              {saved && (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, scale: 0.85, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="flex items-center gap-1.5 font-accent text-sm px-3 py-1.5 rounded-full mb-1"
                  style={{ color: "#9CAF88", backgroundColor: "rgba(156,175,136,0.15)" }}
                >
                  <Check size={12} />
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
              <div className="px-6 py-5">
                <p className="font-body text-[15px] text-ink leading-snug mb-2.5">
                  {t("quietHours")}
                </p>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-accent text-sm text-ink-soft/70">{t("quietFrom")}</span>
                  <input
                    key={`qs-${prefs?.quiet_start}`}
                    type="time"
                    defaultValue={prefs?.quiet_start ?? "23:00"}
                    onBlur={(e) => updatePref({ quiet_start: e.target.value })}
                    disabled={prefsLoading}
                    className={[
                      "font-body text-sm text-ink rounded-xl px-3 py-1.5 border-0 outline-none",
                      "focus:ring-2 focus:ring-rose-400/40 transition-all",
                      prefsLoading ? "opacity-50" : "",
                    ].join(" ")}
                    style={{ background: "rgba(248,168,188,0.18)" }}
                  />
                  <span className="font-accent text-sm text-ink-soft/70">{t("quietTo")}</span>
                  <input
                    key={`qe-${prefs?.quiet_end}`}
                    type="time"
                    defaultValue={prefs?.quiet_end ?? "07:00"}
                    onBlur={(e) => updatePref({ quiet_end: e.target.value })}
                    disabled={prefsLoading}
                    className={[
                      "font-body text-sm text-ink rounded-xl px-3 py-1.5 border-0 outline-none",
                      "focus:ring-2 focus:ring-rose-400/40 transition-all",
                      prefsLoading ? "opacity-50" : "",
                    ].join(" ")}
                    style={{ background: "rgba(248,168,188,0.18)" }}
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
                className="max-w-[420px] mx-auto rounded-3xl p-6"
                style={{
                  background: "linear-gradient(160deg, #FFF9F5 0%, #FFF5F7 100%)",
                  boxShadow: "0 -4px 40px rgba(58,33,41,0.15)",
                }}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <Pig pose="sad" size={80} animate={false} />

                  <div className="space-y-1">
                    <h2
                      className="font-display text-xl text-ink italic"
                      style={{ fontVariationSettings: "'opsz' 40" }}
                    >
                      {t("deleteAll")}
                    </h2>
                    <p className="font-accent text-base text-ink-soft">
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
                    className="w-full font-body text-sm text-ink rounded-2xl
                               px-4 py-3.5 border-2 border-rose-200/60 outline-none
                               focus:border-rose-300 transition-colors text-center tracking-wider"
                    style={{ background: "rgba(255,255,255,0.7)" }}
                  />

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }}
                      className="flex-1 font-accent text-base text-ink-soft py-3.5
                                 rounded-2xl border-2 border-rose-200/60 hover:bg-rose-100 transition-colors"
                    >
                      {t("deleteCancel")}
                    </button>
                    <button
                      onClick={handleWipe}
                      disabled={deleteInput !== confirmWord || deleting}
                      className={[
                        "flex-1 font-accent text-base py-3.5 rounded-2xl transition-colors",
                        deleteInput === confirmWord && !deleting
                          ? "bg-rose-500 text-white hover:bg-rose-600"
                          : "bg-rose-200/40 text-rose-300 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {deleting ? "..." : t("deleteConfirmButton")}
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
