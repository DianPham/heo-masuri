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
      className="w-full max-w-xs flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/70 backdrop-blur-sm text-left hover:bg-rose-50 transition-all duration-150 active:scale-[0.98]"
      style={{ border: "1px dashed rgba(196,102,122,0.5)", boxShadow: "0 4px 12px rgba(196,102,122,0.08)" }}
    >
      <span className="text-2xl" aria-hidden>💕</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-soft">Chưa có hẹn nào sắp tới</p>
        <p className="text-sm font-semibold text-ink">Lên kế hoạch hẹn nhé? 💕</p>
      </div>
      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "#C4667A" }}>
        →
      </span>
    </Link>
  );
}
