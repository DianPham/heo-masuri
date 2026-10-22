/**
 * /heo/notebook/scrapbook/[id] — Open a past lesson in either language.
 * Blueprint §8: "same Stories renderer, but completion state already filled."
 *
 * ?lang=en|zh picks the track:
 *   - a track Heo already completed → re-read (no streak bump, no vocab re-save)
 *   - a track she hasn't done yet (e.g. the Chinese version of an old English
 *     lesson) → studied for real, so completion + vocab are recorded
 * Without ?lang, a lesson with a Chinese track shows the language picker.
 */
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StoriesRenderer } from "@/components/notebook/stories/StoriesRenderer";
import { LanguagePicker } from "@/components/notebook/LanguagePicker";
import { LANG_META, hasZhTrack, langCompletedAt, pageFromRow, parseLang } from "@/lib/notebook/lesson";

// Per-language completion changes as Heo studies — always read fresh.
export const dynamic = "force-dynamic";

export default async function ScrapbookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const requested = parseLang((await searchParams).lang);

  const supabase = createServerClient();

  // Verify it belongs to Heo and has been published to her
  const { data: heo } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "heo")
    .single();
  if (!heo) return notFound();

  const { data: row, error } = await supabase
    .from("daily_pages")
    .select("*")
    .eq("id", id)
    .eq("for_user", heo.id)
    .eq("status", "published")
    .single();

  if (error || !row) return notFound();

  const page = pageFromRow(row);

  if (!requested && hasZhTrack(page)) {
    return (
      <LanguagePicker
        page={page}
        hrefFor={(l) => `/heo/notebook/scrapbook/${page.id}?lang=${l}`}
        backHref="/heo/notebook/scrapbook"
        backLabel="← Sổ lưu niệm"
      />
    );
  }

  const lang = requested === "zh" && hasZhTrack(page) ? "zh" : "en";
  const completedAt = langCompletedAt(page, lang);
  const isReview = completedAt !== null;

  const completedDate = completedAt
    ? new Date(completedAt).toLocaleDateString("vi-VN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : null;

  return (
    <div className="relative min-h-dvh">
      {/* Back link overlay */}
      <div className="fixed top-4 left-4 z-[55]">
        <Link
          href="/heo/notebook/scrapbook"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-500 bg-white/90 backdrop-blur-sm"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
        >
          ← Sổ lưu niệm
        </Link>
      </div>

      {/* Status banner: done in this language, or learning it now */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[55] pointer-events-none">
        <div
          className="px-4 py-1.5 rounded-full text-xs font-semibold text-rose-600 whitespace-nowrap"
          style={{ backgroundColor: "rgba(255,201,213,0.85)", backdropFilter: "blur(8px)" }}
        >
          {completedDate
            ? `✅ ${LANG_META[lang].flag} Hoàn thành ${completedDate}`
            : `${LANG_META[lang].flag} Đang học bằng ${LANG_META[lang].name_vi}`}
        </div>
      </div>

      <StoriesRenderer key={lang} page={page} lang={lang} isReview={isReview} />
    </div>
  );
}
