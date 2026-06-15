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
    <div className="px-5 pb-16 pt-8 max-w-2xl mx-auto">
      <Link href="/calendar" className="back-link mb-4">
        ← Lịch
      </Link>
      <h1 className="page-title mb-1.5">Ngày đặc biệt</h1>
      <p className="page-subtitle mb-6 max-w-md">
        Đoàn tụ, kỷ niệm, sinh nhật — sẽ được nhắc lúc 9 giờ sáng vào hôm đó.
      </p>
      <ImportantDatesList initial={dates} />
    </div>
  );
}
