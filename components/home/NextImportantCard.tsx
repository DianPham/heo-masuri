/**
 * NextImportantCard — small home-card preview of the nearest upcoming
 * important_date (excluding reunion, which has its own countdown widget).
 * Blueprint §6.9. Tap → /calendar/important-dates.
 */
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { nextOccurrence, daysFromTodayVN, todayVN, type ImportantDate } from "@/lib/important-dates";

export default async function NextImportantCard() {
  let rows: ImportantDate[] = [];
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("important_dates")
      .select("*")
      .eq("show_on_home", true);
    rows = (data ?? []) as ImportantDate[];
  } catch {
    return null;
  }
  if (rows.length === 0) return null;

  const today = todayVN();
  const candidates = rows
    .filter((r) => r.kind !== "reunion")
    .map((r) => {
      const occ = nextOccurrence(r, today);
      return occ ? { row: r, occ, days: daysFromTodayVN(occ) } : null;
    })
    .filter(Boolean) as { row: ImportantDate; occ: string; days: number }[];

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.days - b.days);
  const next = candidates[0];

  const dayLabel = next.days === 0
    ? "Hôm nay 💕"
    : next.days === 1
    ? "Ngày mai"
    : `${next.days} ngày nữa`;

  return (
    <Link
      href="/calendar/important-dates"
      className="w-full max-w-xs flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/70 backdrop-blur-sm text-left transition-all duration-150 hover:bg-rose-50 active:scale-[0.98]"
      style={{ border: "1px solid rgba(255,201,213,0.5)", boxShadow: "0 4px 12px rgba(196,102,122,0.08)" }}
    >
      <span className="text-2xl" aria-hidden>{next.row.emoji ?? "⭐"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-soft">Sắp tới</p>
        <p className="text-sm font-semibold text-ink truncate">{next.row.label_vi}</p>
      </div>
      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: next.days === 0 ? "#C4667A" : "#888" }}>
        {dayLabel}
      </span>
    </Link>
  );
}
