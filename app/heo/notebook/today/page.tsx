/**
 * /heo/notebook/today — Daily Stories renderer.
 * Server component: fetches today's published page, falls back to the
 * hard-coded Day 1 test page when no DB page exists (CP3 review phase).
 */
import type { DailyPage } from "@/types/notebook";
import { TEST_PAGE } from "@/lib/notebook/test-page";
import { StoriesRenderer } from "@/components/notebook/stories/StoriesRenderer";

export const dynamic = "force-dynamic";

async function fetchTodayPage(): Promise<DailyPage | null> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const res = await fetch(`${base}/api/notebook/today`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const { page } = (await res.json()) as { page: DailyPage | null };
    return page;
  } catch {
    return null;
  }
}

export default async function TodayPage() {
  // Try DB first; fall back to test page so CP3 review always has content
  const page = (await fetchTodayPage()) ?? TEST_PAGE;

  return <StoriesRenderer page={page} />;
}
