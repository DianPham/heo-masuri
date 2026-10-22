/**
 * LanguagePicker — "which language today?" screen for a lesson that has both
 * an English and a Chinese track. Learning either one finishes the lesson for
 * the day; the other stays open to learn later (here or from the scrapbook).
 */
import Link from "next/link";
import { Pig } from "@/components/theme/Pig";
import { LANG_META, langCompletedAt } from "@/lib/notebook/lesson";
import type { DailyPage, LessonLang } from "@/types/notebook";

const PAPER_BG: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
};

const LANG_STYLE: Record<LessonLang, { bg: string; border: string; accent: string }> = {
  en: { bg: "#FFE4EA", border: "rgba(232,120,152,0.45)", accent: "#C2185B" },
  zh: { bg: "#FFF1D6", border: "rgba(232,150,42,0.45)", accent: "#B45309" },
};

interface LanguagePickerProps {
  page: DailyPage;
  /** Build the study URL for a language */
  hrefFor: (lang: LessonLang) => string;
  backHref: string;
  backLabel: string;
}

export function LanguagePicker({ page, hrefFor, backHref, backLabel }: LanguagePickerProps) {
  const anyDone = Boolean(page.completed_at);
  const options: { lang: LessonLang; title: string | null | undefined }[] = [
    { lang: "en", title: page.title_en },
    { lang: "zh", title: page.title_zh },
  ];

  return (
    <div style={PAPER_BG} className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 gap-7">
      <Pig pose="studying" size={100} animate />

      <div className="text-center flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">{page.title_vi}</p>
        <h1
          className="text-2xl font-bold text-ink leading-snug"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {anyDone ? "Heo muốn học bài này bằng tiếng gì?" : "Hôm nay Heo muốn học bằng tiếng gì?"}
        </h1>
        <p className="text-sm text-ink-soft max-w-xs mx-auto">
          Học một tiếng là xong bài — tiếng còn lại học thêm lúc nào cũng được 🌸
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {options.map(({ lang, title }) => {
          const done = langCompletedAt(page, lang) !== null;
          const style = LANG_STYLE[lang];
          return (
            <Link
              key={lang}
              href={hrefFor(lang)}
              className="flex items-center gap-4 rounded-3xl px-5 py-4 active:scale-[0.98] transition-transform"
              style={{
                backgroundColor: style.bg,
                border: `1.5px solid ${style.border}`,
                boxShadow: "var(--shadow-card)",
              }}
            >
              <span style={{ fontSize: 40, lineHeight: 1 }} aria-hidden>
                {LANG_META[lang].flag}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-ink capitalize" style={{ fontFamily: "var(--font-handwritten)" }}>
                  {LANG_META[lang].name_vi}
                </p>
                {title && <p className="text-sm text-ink-soft truncate">{title}</p>}
              </div>
              <span
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                style={{ backgroundColor: done ? "#5AAF75" : style.accent }}
              >
                {done ? "Xem lại ✓" : "Học →"}
              </span>
            </Link>
          );
        })}
      </div>

      <Link href={backHref} className="text-sm text-rose-400 font-medium">
        {backLabel}
      </Link>
    </div>
  );
}
