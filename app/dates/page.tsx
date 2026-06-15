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
    <div className="min-h-dvh px-5 pb-16 pt-10" style={{ backgroundColor: "var(--color-cream)" }}>
      <div className="max-w-3xl mx-auto">
        <p className="section-eyebrow mb-2">Hẹn hò</p>
        <h1 className="page-title-lg mb-2">Chúng mình hôm nay</h1>
        <p className="page-subtitle mb-8 max-w-md">
          Kế hoạch, ý tưởng, tủ đồ và những ngày đặc biệt — tất cả ở đây.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HubCard
            href="/dates/plan"
            icon="📅"
            label="Lên kế hoạch hẹn"
            sub={
              counts.upcomingDates === 0
                ? "Chưa có hẹn sắp tới — bắt đầu một buổi"
                : counts.nextDateAt
                ? `Sắp hẹn: ${formatDateShort(counts.nextDateAt)}`
                : `${counts.upcomingDates} kế hoạch đang lên`
            }
            badge={counts.upcomingDates > 0 ? counts.upcomingDates : null}
            primary
          />
          <HubCard
            href="/dates/ideas"
            icon="💡"
            label="Kho ý tưởng"
            sub={
              counts.ideas === 0
                ? "Lưu link TikTok / IG để dùng sau"
                : `${counts.ideas} ý tưởng đã lưu`
            }
          />
          <HubCard
            href="/wardrobe"
            icon="👗"
            label="Tủ đồ"
            sub={
              counts.pendingSuggestions > 0
                ? `${counts.pendingSuggestions} gợi ý chờ bạn chốt`
                : counts.wardrobeOwn === 0
                ? "Thêm đồ để người ấy chọn cho bạn"
                : `Tủ bạn ${counts.wardrobeOwn} món · người ấy ${counts.wardrobePartner}`
            }
            badge={counts.pendingSuggestions > 0 ? counts.pendingSuggestions : null}
          />
          <HubCard
            href="/calendar/important-dates"
            icon={counts.nextImportantEmoji ?? "⭐"}
            label="Ngày đặc biệt"
            sub={
              counts.nextImportantDays == null
                ? "Sinh nhật, kỷ niệm — thêm để được nhắc"
                : counts.nextImportantDays === 0
                ? `Hôm nay là ${counts.nextImportantLabel}`
                : counts.nextImportantDays === 1
                ? `Ngày mai · ${counts.nextImportantLabel}`
                : `Còn ${counts.nextImportantDays} ngày · ${counts.nextImportantLabel}`
            }
          />
        </div>

        <div className="mt-10 flex justify-center">
          <Link href={who ? `/${who}` : "/"} className="back-link">
            ← Về trang chính
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
      className="group relative flex items-center gap-4 p-5 rounded-2xl transition-all active:scale-[0.99]"
      style={{
        background: "#ffffff",
        border: primary
          ? "1px solid var(--color-accent-soft)"
          : "1px solid var(--color-hairline)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {primary && (
        <span
          aria-hidden
          className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full"
          style={{ background: "var(--color-accent)" }}
        />
      )}
      <span
        className="text-2xl leading-none flex-shrink-0 grid place-items-center w-11 h-11 rounded-xl"
        style={{ background: primary ? "var(--color-accent-tint)" : "rgba(58,33,41,0.035)" }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-[15px] font-semibold tracking-tight truncate"
          style={{ color: "var(--color-ink)" }}
        >
          {label}
        </p>
        <p className="text-[12.5px] mt-0.5 leading-snug" style={{ color: "var(--color-ink-soft)" }}>
          {sub}
        </p>
      </div>
      {badge != null && badge > 0 && (
        <span
          className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-semibold text-white flex items-center justify-center"
          style={{ background: "var(--color-accent)" }}
          aria-label={`${badge} item${badge === 1 ? "" : "s"}`}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span
        aria-hidden
        className="flex-shrink-0 text-lg transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--color-ink-mute)" }}
      >
        ›
      </span>
    </Link>
  );
}
