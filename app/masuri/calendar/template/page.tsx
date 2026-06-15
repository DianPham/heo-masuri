/**
 * /masuri/calendar/template — recurring schedule editor.
 * Blueprint §6.6. Masuri-only (middleware gates /masuri/*).
 */
import { headers, cookies } from "next/headers";
import { RecurringTemplateEditor } from "@/components/calendar/RecurringTemplateEditor";

export const dynamic = "force-dynamic";

type Range = { start_minute: number; end_minute: number };
type TemplateShape = Range[][];

const EMPTY: TemplateShape = [[], [], [], [], [], [], []];

async function fetchTemplate(): Promise<{ template: TemplateShape; enabled: boolean }> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  try {
    const res = await fetch(`${base}/api/calendar/recurring-template`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return { template: EMPTY, enabled: false };
    return await res.json();
  } catch {
    return { template: EMPTY, enabled: false };
  }
}

export default async function MasuriTemplatePage() {
  const { template, enabled } = await fetchTemplate();
  return (
    <div className="min-h-dvh px-5 pb-10 pt-8" style={{ backgroundColor: "#FFF9F5" }}>
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-2xl font-bold text-ink mb-1"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Lịch lặp hàng tuần
        </h1>
        <p className="text-xs text-ink-soft mb-5">
          Đánh dấu các khung giờ bận cố định (đi làm, học, v.v.) — áp dụng vào lịch tuần.
        </p>
        <RecurringTemplateEditor initialTemplate={template} initialEnabled={enabled} />
      </div>
    </div>
  );
}
