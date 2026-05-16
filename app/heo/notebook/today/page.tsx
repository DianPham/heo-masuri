/**
 * /heo/notebook/today — Daily Stories renderer.
 * Fetches today's published page, or the most recent unfinished carry-over lesson.
 * Falls back to the hard-coded test page when no DB page exists.
 */
import type { DailyPage } from "@/types/notebook";
import { TEST_PAGE } from "@/lib/notebook/test-page";
import { StoriesRenderer } from "@/components/notebook/stories/StoriesRenderer";

export const revalidate = 60;

type TodayResponse = {
  page: DailyPage | null;
  completed: boolean;
  carry_over: boolean;
};

async function fetchTodayPage(): Promise<TodayResponse> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const res = await fetch(`${base}/api/notebook/today`, { cache: "no-store" });
    if (!res.ok) return { page: null, completed: false, carry_over: false };
    return (await res.json()) as TodayResponse;
  } catch {
    return { page: null, completed: false, carry_over: false };
  }
}

export default async function TodayPage() {
  const { page, carry_over } = await fetchTodayPage();
  const resolved = page ?? TEST_PAGE;

  return (
    <div className="relative">
      {/* Carry-over banner — shows when Heo is catching up on a missed lesson */}
      {carry_over && page && (
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
      <StoriesRenderer page={resolved} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  // "2026-05-15" → "15/05"
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}
