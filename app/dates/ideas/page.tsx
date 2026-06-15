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
    <div className="min-h-dvh px-5 pb-16 pt-10" style={{ backgroundColor: "var(--color-cream)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/dates" className="back-link mb-4">
          ← Hẹn hò
        </Link>
        <h1 className="page-title mb-1.5">Kho ý tưởng</h1>
        <p className="page-subtitle mb-6 max-w-md">
          Lưu link TikTok hay IG để dùng sau — tự lấy ảnh và tiêu đề.
        </p>
        <DateIdeasGrid initial={ideas} />
      </div>
    </div>
  );
}
