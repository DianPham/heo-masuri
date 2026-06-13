/**
 * /calendar/important-dates — list + add/edit. Shared (both users can view + write).
 * Blueprint §6.7.
 */
import { headers, cookies } from "next/headers";
import Link from "next/link";
import { ImportantDatesList } from "@/components/calendar/ImportantDatesList";
import type { ImportantDate } from "@/lib/important-dates";

export const dynamic = "force-dynamic";

async function fetchDates(): Promise<ImportantDate[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  try {
    const res = await fetch(`${base}/api/important-dates`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.dates ?? [];
  } catch {
    return [];
  }
}

export default async function ImportantDatesPage() {
  const dates = await fetchDates();
  return (
    <div className="px-5 pb-10 pt-6">
      <Link href="/calendar" className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink mb-3 active:scale-95 transition-all">
        ← Lịch
      </Link>
      <h1
        className="text-2xl font-bold text-ink mb-1"
        style={{ fontFamily: "var(--font-handwritten)" }}
      >
        Ngày đặc biệt
      </h1>
      <p className="text-xs text-ink-soft mb-5">
        Đoàn tụ, kỷ niệm, sinh nhật — sẽ được nhắc lúc 9h sáng vào ngày đó 💕
      </p>
      <ImportantDatesList initial={dates} />
    </div>
  );
}
