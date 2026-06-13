/**
 * /dates/ideas — shared idea bank. Blueprint §7.1.
 */
import { headers, cookies } from "next/headers";
import { DateIdeasGrid, type DateIdea } from "@/components/dates/DateIdeasGrid";

export const dynamic = "force-dynamic";

async function fetchIdeas(): Promise<DateIdea[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  try {
    const res = await fetch(`${base}/api/dates/ideas`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.ideas ?? [];
  } catch {
    return [];
  }
}

export default async function IdeasPage() {
  const ideas = await fetchIdeas();
  return (
    <div className="min-h-dvh px-5 pb-10 pt-8" style={{ backgroundColor: "#FFF9F5" }}>
      <div className="max-w-3xl mx-auto">
        <h1
          className="text-2xl font-bold text-ink mb-1"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Ngân hàng ý tưởng
        </h1>
        <p className="text-xs text-ink-soft mb-2">
          Thả vào những ý tưởng hẹn hò để dùng sau. Dán link TikTok / IG để tự lấy ảnh + tiêu đề.
        </p>
        <a href="/dates/plan" className="inline-block text-xs text-rose-400 underline underline-offset-2 mb-5">
          Lên kế hoạch hẹn ↗
        </a>
        <DateIdeasGrid initial={ideas} />
      </div>
    </div>
  );
}
