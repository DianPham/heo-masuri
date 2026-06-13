/**
 * /dates — hub for the Phase 2 dating universe. Plan / Ideas / Wardrobe /
 * Important dates each get a card with at-a-glance counts so the user knows
 * where to go.
 *
 * Designed to replace the previous "Plan something" home card as the canonical
 * entry into dates. The home card still surfaces when nothing's upcoming, but
 * once anything is scheduled, this hub is where everything lives.
 */
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { nextOccurrence, daysFromTodayVN, todayVN, type ImportantDate } from "@/lib/important-dates";

export const dynamic = "force-dynamic";

type Counts = {
  upcomingDates: number;
  nextDateAt: string | null;
  ideas: number;
  wardrobeOwn: number;
  wardrobePartner: number;
  pendingSuggestions: number;
  nextImportantLabel: string | null;
  nextImportantDays: number | null;
  nextImportantEmoji: string | null;
};

async function fetchCounts(viewerSlug: "heo" | "masuri" | ""): Promise<Counts> {
  const out: Counts = {
    upcomingDates: 0,
    nextDateAt: null,
    ideas: 0,
    wardrobeOwn: 0,
    wardrobePartner: 0,
    pendingSuggestions: 0,
    nextImportantLabel: null,
    nextImportantDays: null,
    nextImportantEmoji: null,
  };
  if (!viewerSlug) return out;

  try {
    const supabase = createServerClient();
    const nowIso = new Date().toISOString();

    const { data: viewer } = await supabase.from("users").select("id").eq("slug", viewerSlug).single();
    const viewerId = viewer?.id as string | undefined;

    const [
      datesRes,
      ideasRes,
      ownItemsRes,
      partnerItemsRes,
      pendingRes,
      importantRes,
    ] = await Promise.all([
      supabase
        .from("scheduled_dates")
        .select("id, start_at")
        .gte("end_at", nowIso)
        .in("status", ["planning", "ready"])
        .order("start_at", { ascending: true })
        .limit(5),
      supabase.from("date_ideas").select("id", { count: "exact", head: true }).eq("archived", false),
      viewerId
        ? supabase
            .from("wardrobe_items")
            .select("id", { count: "exact", head: true })
            .eq("owner", viewerId)
            .eq("archived", false)
        : Promise.resolve({ count: 0 } as { count: number | null }),
      supabase.from("wardrobe_items").select("id", { count: "exact", head: true }).eq("archived", false),
      viewerId
        ? supabase
            .from("outfit_suggestions")
            .select("id", { count: "exact", head: true })
            .eq("target_user", viewerId)
            .eq("status", "pending")
        : Promise.resolve({ count: 0 } as { count: number | null }),
      supabase.from("important_dates").select("*").eq("show_on_home", true),
    ]);

    out.upcomingDates = datesRes.data?.length ?? 0;
    out.nextDateAt = (datesRes.data?.[0]?.start_at as string | undefined) ?? null;
    out.ideas = ideasRes.count ?? 0;
    out.wardrobeOwn = (ownItemsRes as { count: number | null }).count ?? 0;
    out.wardrobePartner = (partnerItemsRes.count ?? 0) - out.wardrobeOwn;
    if (out.wardrobePartner < 0) out.wardrobePartner = 0;
    out.pendingSuggestions = (pendingRes as { count: number | null }).count ?? 0;

    const rows = (importantRes.data ?? []) as ImportantDate[];
    const today = todayVN();
    const candidates = rows
      .filter((r) => r.kind !== "reunion")
      .map((r) => {
        const occ = nextOccurrence(r, today);
        return occ ? { row: r, occ, days: daysFromTodayVN(occ) } : null;
      })
      .filter(Boolean) as { row: ImportantDate; occ: string; days: number }[];
    candidates.sort((a, b) => a.days - b.days);
    const next = candidates[0];
    if (next) {
      out.nextImportantLabel = next.row.label_vi;
      out.nextImportantDays = next.days;
      out.nextImportantEmoji = next.row.emoji ?? "⭐";
    }
  } catch {
    /* env vars unset or DB unreachable — render with zeros */
  }

  return out;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default async function DatesHubPage() {
  const cookieStore = await cookies();
  const who = (cookieStore.get("who")?.value ?? "") as "heo" | "masuri" | "";
  const counts = await fetchCounts(who);

  return (
    <div className="min-h-dvh px-5 pb-10 pt-8" style={{ backgroundColor: "#FFF9F5" }}>
      <div className="max-w-3xl mx-auto">
        <h1
          className="text-3xl font-bold text-ink mb-1"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Hẹn hò 💕
        </h1>
        <p className="text-sm text-ink-soft mb-6">
          Tất cả về kế hoạch hẹn của Heo & Masuri.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HubCard
            href="/dates/plan"
            icon="📅"
            label="Lên kế hoạch hẹn"
            sub={
              counts.upcomingDates === 0
                ? "Chưa có hẹn nào sắp tới"
                : counts.nextDateAt
                ? `Tới: ${formatDateShort(counts.nextDateAt)}`
                : `${counts.upcomingDates} kế hoạch đang chờ`
            }
            badge={counts.upcomingDates > 0 ? counts.upcomingDates : null}
            primary
          />
          <HubCard
            href="/dates/ideas"
            icon="💡"
            label="Ngân hàng ý tưởng"
            sub={
              counts.ideas === 0
                ? "Lưu link TikTok / IG về đây"
                : `${counts.ideas} ý tưởng`
            }
          />
          <HubCard
            href="/wardrobe"
            icon="👗"
            label="Tủ đồ"
            sub={
              counts.pendingSuggestions > 0
                ? `${counts.pendingSuggestions} gợi ý đang chờ bạn`
                : counts.wardrobeOwn === 0
                ? "Thêm đồ vào tủ"
                : `${counts.wardrobeOwn} món của bạn · ${counts.wardrobePartner} của người ấy`
            }
            badge={counts.pendingSuggestions > 0 ? counts.pendingSuggestions : null}
          />
          <HubCard
            href="/calendar/important-dates"
            icon={counts.nextImportantEmoji ?? "⭐"}
            label="Ngày quan trọng"
            sub={
              counts.nextImportantDays == null
                ? "Thêm sinh nhật / kỷ niệm…"
                : counts.nextImportantDays === 0
                ? `Hôm nay là ${counts.nextImportantLabel} 💕`
                : counts.nextImportantDays === 1
                ? `Ngày mai: ${counts.nextImportantLabel}`
                : `${counts.nextImportantDays} ngày nữa: ${counts.nextImportantLabel}`
            }
          />
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href={who ? `/${who}` : "/"}
            className="text-xs text-ink-soft hover:text-ink active:scale-95 transition-all"
          >
            ← Trở về trang chính
          </Link>
        </div>
      </div>
    </div>
  );
}

function HubCard({
  href,
  icon,
  label,
  sub,
  badge,
  primary,
}: {
  href: string;
  icon: string;
  label: string;
  sub: string;
  badge?: number | null;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex items-start gap-3 p-4 rounded-2xl bg-white hover:bg-rose-50 active:scale-[0.98] transition-all"
      style={{
        border: primary
          ? "1.5px solid rgba(196,102,122,0.5)"
          : "1px solid rgba(255,201,213,0.4)",
        boxShadow: primary
          ? "0 4px 16px rgba(196,102,122,0.18)"
          : "0 2px 10px rgba(196,102,122,0.06)",
      }}
    >
      <span className="text-3xl leading-none flex-shrink-0" aria-hidden>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink truncate">{label}</p>
        <p className="text-xs text-ink-soft mt-0.5 leading-snug">{sub}</p>
      </div>
      {badge != null && badge > 0 && (
        <span
          className="absolute top-2 right-2 min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
          style={{ backgroundColor: "#C4667A" }}
          aria-label={`${badge} item${badge === 1 ? "" : "s"}`}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
