/**
 * /dates/plan — index of planning sessions + quick-create form.
 * The full date-scheduler flow lands in CP10 (§7.5). This page is the
 * minimal entry point so CP9 is end-to-end testable.
 */
import { headers, cookies } from "next/headers";
import Link from "next/link";
import { PlanIndex } from "@/components/dates/PlanIndex";
import type { ScheduledDate } from "@/components/dates/PlanShell";

export const dynamic = "force-dynamic";

async function fetchPlans(): Promise<ScheduledDate[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  try {
    const res = await fetch(`${base}/api/dates/scheduled`, {
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

export default async function PlanIndexPage() {
  const plans = await fetchPlans();
  return (
    <div className="min-h-dvh px-5 pb-16 pt-10" style={{ backgroundColor: "var(--color-cream)" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/dates" className="back-link mb-4">
          ← Hẹn hò
        </Link>
        <h1 className="page-title mb-1.5">Lên kế hoạch hẹn</h1>
        <p className="page-subtitle mb-6 max-w-md">
          Chọn khung giờ, điền vài ứng viên, rồi để vòng quay chốt giúp.
        </p>
        <PlanIndex initial={plans} />
      </div>
    </div>
  );
}
