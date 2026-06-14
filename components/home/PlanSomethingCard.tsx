/**
 * PlanSomethingCard — home CTA shown when no upcoming scheduled_date exists.
 * Tap → /dates/plan. Blueprint §7.5.
 */
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

export default async function PlanSomethingCard() {
  try {
    const supabase = createServerClient();
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("scheduled_dates")
      .select("id")
      .gte("end_at", nowIso)
      .in("status", ["planning", "ready"])
      .limit(1);
    if (data && data.length > 0) return null;
  } catch {
    return null;
  }

  return (
    <Link
      href="/dates/plan"
      className="w-full max-w-xs flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white text-left transition-all duration-150 active:scale-[0.98] hover:translate-y-[-1px]"
      style={{ border: "1px dashed var(--color-accent-soft)", boxShadow: "var(--shadow-sm)" }}
    >
      <span
        className="text-xl grid place-items-center w-10 h-10 rounded-xl flex-shrink-0"
        style={{ background: "var(--color-accent-tint)" }}
        aria-hidden
      >
        💕
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px]" style={{ color: "var(--color-ink-mute)" }}>
          Chưa có hẹn nào sắp tới
        </p>
        <p className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
          Lên kế hoạch hẹn nhé?
        </p>
      </div>
      <span className="text-base" style={{ color: "var(--color-accent)" }}>
        →
      </span>
    </Link>
  );
}
