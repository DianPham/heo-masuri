/**
 * /heo/notebook/scrapbook/[id] — Re-read a completed page.
 * Blueprint §8: "same Stories renderer, but completion state already filled."
 * No streak bump. No vocab re-save.
 */
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StoriesRenderer } from "@/components/notebook/stories/StoriesRenderer";
import type { DailyPage } from "@/types/notebook";

export const revalidate = 3600; // completed pages don't change

export default async function ScrapbookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createServerClient();

  // Verify it belongs to Heo and is completed
  const { data: heo } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "heo")
    .single();
  if (!heo) return notFound();

  const { data: row, error } = await supabase
    .from("daily_pages")
    .select("id, title_vi, title_en, topic, difficulty, cards, scheduled_for, completed_at")
    .eq("id", id)
    .eq("for_user", heo.id)
    .not("completed_at", "is", null)
    .single();

  if (error || !row) return notFound();

  const page: DailyPage = {
    id: row.id as string,
    title_vi: row.title_vi as string,
    title_en: row.title_en as string,
    topic: row.topic as string,
    difficulty: row.difficulty as 1 | 2 | 3 | 4 | 5,
    cards: row.cards as DailyPage["cards"],
    scheduled_for: row.scheduled_for as string,
    completed_at: row.completed_at as string,
  };

  const completedDate = new Date(row.completed_at as string).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });

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

      {/* Completed banner */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[55] pointer-events-none">
        <div
          className="px-4 py-1.5 rounded-full text-xs font-semibold text-rose-600 whitespace-nowrap"
          style={{ backgroundColor: "rgba(255,201,213,0.85)", backdropFilter: "blur(8px)" }}
        >
          ✅ Hoàn thành {completedDate}
        </div>
      </div>

      {/* Stories renderer in review mode (no streak bump, no vocab re-save) */}
      <StoriesRenderer page={page} isReview />
    </div>
  );
}
