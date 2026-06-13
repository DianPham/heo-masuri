/**
 * /dates/ideas — shared idea bank. Blueprint §7.1.
 */
import { headers, cookies } from "next/headers";
import Link from "next/link";
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
        <Link href="/dates" className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink mb-3 active:scale-95 transition-all">
          ← Hẹn hò
        </Link>
        <h1
          className="text-2xl font-bold text-ink mb-1"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Ngân hàng ý tưởng
        </h1>
        <p className="text-xs text-ink-soft mb-5">
          Thả vào những ý tưởng hẹn hò để dùng sau. Dán link TikTok / IG để tự lấy ảnh + tiêu đề.
        </p>
        <DateIdeasGrid initial={ideas} />
      </div>
    </div>
  );
}
