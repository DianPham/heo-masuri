/**
 * /dates/plan/[id] — decision-flipper page for a single scheduled_date.
 * Blueprint §7.4.
 */
import { headers, cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PlanShell, type ScheduledDate, type Template } from "@/components/dates/PlanShell";
import { getViewerUserId } from "@/lib/calendar";

export const dynamic = "force-dynamic";

async function relay<T>(path: string, fallback: T): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  try {
    const res = await fetch(`${base}${path}`, { headers: { cookie: cookieHeader }, cache: "no-store" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch { return fallback; }
}

export default async function PlanByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewerId = (await getViewerUserId()) ?? "";
  const [{ date }, { templates }] = await Promise.all([
    relay<{ date: ScheduledDate }>(`/api/dates/scheduled/${id}`, { date: null as unknown as ScheduledDate }),
    relay<{ templates: Template[] }>(`/api/templates`, { templates: [] }),
  ]);
  if (!date) notFound();

  return (
    <div className="min-h-dvh px-5 pb-16 pt-8" style={{ backgroundColor: "var(--color-cream)" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/dates/plan" className="back-link mb-4">
          ← Tất cả kế hoạch
        </Link>
        <h1 className="page-title mb-1.5">{date.title || "Kế hoạch hẹn"}</h1>
        <p className="page-subtitle mb-6">
          {new Date(date.start_at).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}
          {" — "}
          {new Date(date.end_at).toLocaleString("vi-VN", { timeStyle: "short" })}
        </p>
        <PlanShell initial={date} templates={templates} viewerId={viewerId} />
      </div>
    </div>
  );
}
