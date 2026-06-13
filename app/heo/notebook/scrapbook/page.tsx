/**
 * /heo/notebook/scrapbook — Scrapbook history
 * Blueprint §8: polaroid grid of completed pages, washi tape, stickers.
 * Month-sectioned after 30 entries.
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Pig } from "@/components/theme/Pig";
import { Sticker } from "@/components/notebook/Sticker";
import { Tape } from "@/components/notebook/Tape";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

// Topic → pastel background colour
const TOPIC_COLORS: Record<string, string> = {
  greeting: "#FFE4EA",
  feelings: "#EDE4FF",
  food:     "#FFF3CD",
  travel:   "#D4EDFF",
  daily:    "#D4F8E8",
  weather:  "#E4F0FF",
  work:     "#F8E4FF",
  review:   "#FFE9D4",
};

// Topic → emoji
const TOPIC_EMOJI: Record<string, string> = {
  greeting: "👋",
  feelings: "💭",
  food:     "🍜",
  travel:   "✈️",
  daily:    "☀️",
  weather:  "🌤",
  work:     "💼",
  review:   "🔁",
};

// Washi tape colours cycling by week (Sun = 0)
const TAPE_BY_DOW: Array<"pink" | "mint" | "butter" | "lilac"> = [
  "pink", "mint", "butter", "lilac", "pink", "mint", "butter",
];

// Sticker pairs — one at bottom-right, one at top-left
const STICKER_PAIRS: Array<["star_filled" | "sparkle" | "flower_rose" | "flower_daisy" | "bow_pink" | "bow_butter" | "heart_filled" | "star_outline", "star_filled" | "sparkle" | "flower_rose" | "flower_daisy" | "bow_pink" | "bow_butter" | "heart_filled" | "star_outline"]> = [
  ["star_filled", "flower_rose"],
  ["sparkle", "bow_pink"],
  ["flower_daisy", "star_outline"],
  ["bow_butter", "heart_filled"],
  ["flower_rose", "sparkle"],
];

interface CompletedPage {
  id: string;
  title_vi: string;
  topic: string;
  completed_at: string;
  scheduled_for: string;
}

async function fetchCompletedPages(): Promise<CompletedPage[]> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return [];

    const { data } = await supabase
      .from("daily_pages")
      .select("id, title_vi, topic, completed_at, scheduled_for")
      .eq("for_user", heo.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    return (data ?? []).map((p) => ({
      id: p.id as string,
      title_vi: (p.title_vi as string) ?? "Trang học",
      topic: (p.topic as string) ?? "daily",
      completed_at: p.completed_at as string,
      scheduled_for: p.scheduled_for as string,
    }));
  } catch {
    return [];
  }
}

function formatHandwritten(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} tháng ${d.getMonth() + 1}`;
}

// Group pages by month label, e.g. "Tháng 5, 2026"
function groupByMonth(pages: CompletedPage[]): { label: string; pages: CompletedPage[] }[] {
  const groups = new Map<string, CompletedPage[]>();
  for (const p of pages) {
    const d = new Date(p.completed_at);
    const label = `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(p);
  }
  return [...groups.entries()].map(([label, pages]) => ({ label, pages }));
}

// Per-polaroid deterministic random values (avoid hydration mismatch)
function polaroidMeta(id: string, idx: number) {
  // derive a stable "random" number from id + idx
  const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1) + idx;
  const rot = ((seed % 7) - 3) * 1.0; // -3° to +3°
  const stickerIdx = seed % STICKER_PAIRS.length;
  const tapeColor = TAPE_BY_DOW[seed % 7];
  return { rot, stickerPair: STICKER_PAIRS[stickerIdx], tapeColor };
}

export default async function ScrapbookPage() {
  const t = await getTranslations("notebook.scrapbook");
  const pages = await fetchCompletedPages();

  if (pages.length === 0) {
    return <EmptyState t={t} />;
  }

  // Group into months if many pages; otherwise flat
  const useMonthGroups = pages.length >= 30;
  const groups = useMonthGroups ? groupByMonth(pages) : [{ label: "", pages }];

  return (
    <div style={PAPER_BG} className="min-h-dvh pb-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative px-5 pt-10 pb-6">
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <Tape color="pink" width={22} length={100} rotate={-1} />
        </div>
        <h1
          className="text-3xl font-bold text-ink text-center mt-4"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {t("title")}
        </h1>
        <p className="text-center text-sm text-ink-soft mt-1">
          {pages.length} trang đã hoàn thành 🌸
        </p>
      </div>

      {/* ── Polaroid grid ─────────────────────────────────── */}
      <div className="px-3 max-w-5xl mx-auto">
        {groups.map(({ label, pages: groupPages }) => (
          <div key={label}>
            {label && (
              <p
                className="text-lg font-bold text-ink px-2 mb-3 mt-6"
                style={{ fontFamily: "var(--font-handwritten)" }}
              >
                {label}
              </p>
            )}
            {/* Two-column on mobile, denser on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6">
              {groupPages.map((page, idx) => {
                const { rot, stickerPair, tapeColor } = polaroidMeta(page.id, idx);
                const bg = TOPIC_COLORS[page.topic] ?? "#FFE4EA";
                const emoji = TOPIC_EMOJI[page.topic] ?? "📓";
                return (
                  <Link
                    key={page.id}
                    href={`/heo/notebook/scrapbook/${page.id}`}
                    className="block active:scale-95 transition-transform duration-150"
                    style={{ transform: `rotate(${rot}deg)` }}
                  >
                    <div
                      className="relative rounded-2xl overflow-visible"
                      style={{
                        backgroundColor: "var(--polaroid-bg)",
                        padding: "10px 10px 32px",
                        boxShadow: "var(--polaroid-shadow)",
                      }}
                    >
                      {/* Tape across top */}
                      <div className="absolute top-[-10px] left-1/2 -translate-x-1/2">
                        <Tape color={tapeColor} width={16} length={56} rotate={rot * -0.5} />
                      </div>

                      {/* Photo area */}
                      <div
                        className="w-full aspect-square rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: bg }}
                      >
                        <span style={{ fontSize: 44 }}>{emoji}</span>
                      </div>

                      {/* Caption */}
                      <div className="pt-2 px-1">
                        <p
                          className="text-xs font-bold text-ink leading-snug"
                          style={{ fontFamily: "var(--font-handwritten)", fontSize: 13 }}
                        >
                          {page.title_vi}
                        </p>
                        <p
                          className="text-xs text-ink-soft mt-0.5"
                          style={{ fontFamily: "var(--font-handwritten)", fontSize: 11 }}
                        >
                          {formatHandwritten(page.completed_at)}
                        </p>
                      </div>

                      {/* Corner stickers */}
                      <div className="absolute -bottom-3 -right-2 rotate-12">
                        <Sticker type={stickerPair[0]} size={20} />
                      </div>
                      <div className="absolute -top-1 -left-2 -rotate-6">
                        <Sticker type={stickerPair[1]} size={18} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Decorative bottom ─────────────────────────────── */}
      <div className="flex justify-center gap-6 pt-10 opacity-30">
        <Sticker type="sparkle" size={22} />
        <Sticker type="moon" size={22} />
        <Sticker type="flower_daisy" size={22} />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ t }: { t: Awaited<ReturnType<typeof getTranslations>> }) {
  return (
    <div style={PAPER_BG} className="min-h-dvh">
      <div className="relative px-5 pt-10 pb-6">
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <Tape color="pink" width={22} length={100} rotate={-1} />
        </div>
        <h1
          className="text-3xl font-bold text-ink text-center mt-4"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {t("title")}
        </h1>
        <p className="text-center text-sm text-ink-soft mt-1">
          Những trang Heo đã hoàn thành
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-8 pt-8 pb-16">
        <div
          className="relative mb-10"
          style={{
            transform: "rotate(-3deg)",
            filter: "drop-shadow(var(--polaroid-shadow))",
          }}
        >
          <div
            className="w-52 rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--polaroid-bg)", padding: "12px 12px 36px" }}
          >
            <div className="absolute top-[-10px] left-1/2 -translate-x-1/2">
              <Tape color="mint" width={18} length={64} rotate={2} />
            </div>
            <div
              className="w-full aspect-square rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: "#FFE4EA" }}
            >
              <Pig pose="sleepy" size={88} animate={false} />
            </div>
            <p
              className="text-center text-xs text-ink-soft"
              style={{ fontFamily: "var(--font-handwritten)", fontSize: 14 }}
            >
              Chưa có trang nào...
            </p>
          </div>
          <div className="absolute -bottom-3 -right-3 rotate-12">
            <Sticker type="flower_rose" size={24} />
          </div>
          <div className="absolute -top-2 -left-2 -rotate-6">
            <Sticker type="star_filled" size={20} />
          </div>
        </div>

        <p
          className="text-2xl font-bold text-ink text-center mb-2"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {t("empty")}
        </p>
        <p className="text-sm text-ink-soft text-center mb-8">{t("emptyHint")}</p>

        <Link
          href="/heo/notebook/today"
          className="bg-rose-500 text-white text-sm font-semibold px-8 py-3.5 rounded-2xl"
          style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
        >
          {t("openToday")}
        </Link>
      </div>

      <div className="flex justify-center gap-5 pb-8 opacity-35">
        <Sticker type="sparkle" size={22} />
        <Sticker type="moon" size={22} />
        <Sticker type="flower_daisy" size={22} />
      </div>
    </div>
  );
}
