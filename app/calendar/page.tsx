/**
 * /calendar — shared calendar route (both Heo and Masuri).
 * Identity comes from the soft-gate cookie.
 *
 * Per blueprint §6.3 / §6.5, this is the same route on mobile and desktop;
 * the rendered view differs by viewport. CP3 ships the mobile views
 * (WeekHourView, WeekBlockView). CP4 adds the desktop horizontal week.
 */
import { headers, cookies } from "next/headers";
import { CalendarShell } from "@/components/calendar/CalendarShell";
import { getViewerUserId } from "@/lib/calendar";
import type { VisibleEvent } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/** Monday of the current ISO week (UTC+7). Returns 'YYYY-MM-DD'. */
function currentMondayVN(): string {
  const nowVn = new Date(Date.now() + 7 * 3_600_000);
  const dow = nowVn.getUTCDay() || 7;  // 1=Mon … 7=Sun
  const monday = new Date(nowVn);
  monday.setUTCDate(nowVn.getUTCDate() - (dow - 1));
  return monday.toISOString().slice(0, 10);
}

async function fetchWeek(mondayStr: string): Promise<VisibleEvent[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  // Range: Monday 00:00 VN → next Monday 00:00 VN
  const fromVn = `${mondayStr}T00:00:00+07:00`;
  const fromMs = new Date(fromVn).getTime();
  const toMs = fromMs + 7 * 86_400_000;
  const toIso = new Date(toMs).toISOString();
  const fromIso = new Date(fromMs).toISOString();

  try {
    const res = await fetch(
      `${base}/api/calendar/events?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
      { headers: { cookie: cookieHeader }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.events ?? [];
  } catch {
    return [];
  }
}

export default async function CalendarPage() {
  const viewerId = await getViewerUserId();
  const monday = currentMondayVN();
  const events = await fetchWeek(monday);

  return (
    <CalendarShell
      initialMonday={monday}
      initialEvents={events}
      viewerId={viewerId ?? ""}
    />
  );
}
