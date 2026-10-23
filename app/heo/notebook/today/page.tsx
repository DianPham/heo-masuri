/**
 * /heo/notebook/today — Daily Stories renderer.
 *
 * ?lang=en|zh picks the track. Without it, a lesson that has a Chinese track
 * shows the language picker first; English-only lessons open directly.
 *
 * Resolves the active lesson directly from Supabase rather than self-fetching
 * /api/notebook/today (that round-trip was flaking on Vercel — when it failed
 * the page silently rendered TEST_PAGE, which made the Study button land on
 * "Chào buổi sáng" / Day 1 instead of the real carry-over lesson).
 *
 * Priority:
 *   1. Today's published page (normal case)
 *   2. Most recent unfinished published page from before today (carry-over)
 */
import Link from "next/link";
import type { DailyPage } from "@/types/notebook";
import { StoriesRenderer } from "@/components/notebook/stories/StoriesRenderer";
import { LanguagePicker } from "@/components/notebook/LanguagePicker";
import { Pig } from "@/components/theme/Pig";
import { createServerClient } from "@/lib/supabase/server";
import { hasZhTrack, langCompletedAt, pageFromRow, parseLang } from "@/lib/notebook/lesson";

export const dynamic = "force-dynamic";

type Resolved = {
  page: DailyPage | null;
  carry_over: boolean;
};

function todayVN(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

async function resolveTodayPage(): Promise<Resolved> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return { page: null, carry_over: false };

    const today = todayVN();

    const { data: todayRow } = await supabase
      .from("daily_pages")
      .select("*")
      .eq("for_user", heo.id)
      .eq("scheduled_for", today)
      .eq("status", "published")
      .maybeSingle();

    if (todayRow) return { page: pageFromRow(todayRow), carry_over: false };

    const { data: carryRow } = await supabase
      .from("daily_pages")
      .select("*")
      .eq("for_user", heo.id)
      .eq("status", "published")
      .is("completed_at", null)
      .lt("scheduled_for", today)
      .order("scheduled_for", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (carryRow) return { page: pageFromRow(carryRow), carry_over: true };
    return { page: null, carry_over: false };
  } catch (err) {
    console.error("[/heo/notebook/today] resolve failed", err);
    return { page: null, carry_over: false };
  }
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { page, carry_over } = await resolveTodayPage();

  // No lesson scheduled and nothing carried over → real empty state. Previously
  // this fell through to TEST_PAGE (the bundled Day 1 "Chào buổi sáng"), so
  // after Heo finished today's lesson and refreshed, Day 1 silently came back.
  if (!page) return <NoLessonToday />;

  const requested = parseLang((await searchParams).lang);
  if (!requested && hasZhTrack(page)) {
    return (
      <LanguagePicker
        page={page}
        hrefFor={(l) => `/heo/notebook/today?lang=${l}`}
        backHref="/heo/notebook"
        backLabel="← Quay lại sổ"
      />
    );
  }
  const lang = requested === "zh" && hasZhTrack(page) ? "zh" : "en";
  // Re-opening a track she already finished is a re-read: no second streak
  // bump or vocab re-save.
  const isReview = langCompletedAt(page, lang) !== null;

  return (
    <div className="relative">
      {/* Carry-over banner — shows when Heo is catching up on a missed lesson */}
      {carry_over && (
        <div
          className="sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-center"
          style={{ backgroundColor: "rgba(255,201,213,0.92)", backdropFilter: "blur(6px)" }}
        >
          <span>📖</span>
          <span>
            Bài từ {formatDate(page.scheduled_for)} chưa xong — hoàn thành nha Heo 🌸
          </span>
        </div>
      )}
      <StoriesRenderer key={lang} page={page} lang={lang} isReview={isReview} />
    </div>
  );
}

function NoLessonToday() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-8 py-12 text-center gap-6">
      <Pig pose="sleepy" size={120} animate />
      <div className="flex flex-col gap-2">
        <h1
          className="text-2xl font-bold text-ink"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Hôm nay chưa có trang mới 💤
        </h1>
        <p className="text-sm text-ink-soft max-w-xs">
          Heo đã học hết bài rồi. Mai mình quay lại học tiếp nha 🌸
        </p>
      </div>
      <Link
        href="/heo/notebook"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-white"
        style={{
          backgroundColor: "#e87898",
          boxShadow: "0 4px 12px rgba(232,120,152,0.35)",
        }}
      >
        Quay lại trang chủ sổ
      </Link>
    </div>
  );
}

function formatDate(dateStr: string): string {
  // "2026-05-15" → "15/05"
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}
