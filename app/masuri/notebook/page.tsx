/**
 * /masuri/notebook — Masuri's notebook dashboard (CP7)
 * Shows Heo's live streak, actions for Masuri, ask inbox.
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Pig } from "@/components/theme/Pig";
import { Sticker } from "@/components/notebook/Sticker";
import { Tape } from "@/components/notebook/Tape";
import { MasuriAskInbox } from "@/components/notebook/MasuriAskInbox";
import { MasuriGrantRestButton } from "@/components/notebook/MasuriGrantRestButton";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

type HeoLetter = {
  id: string;
  kind: string;
  body: string;
  delivered_at: string;
  seen_at: string | null;
  hasReply: boolean;
};

type HeoLettersResult = {
  dashboard: HeoLetter[];  // unseen-first, filtered
  totalCount: number;
  unseenCount: number;
};

async function fetchHeoLetters(): Promise<HeoLettersResult> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return { dashboard: [], totalCount: 0, unseenCount: 0 };

    const { data: letters } = await supabase
      .from("letters")
      .select("id, kind, body, delivered_at, seen_at")
      .eq("from_user", heo.id)
      .in("kind", ["weekly_letter", "two_truths"])
      .not("delivered_at", "is", null)
      .order("delivered_at", { ascending: false })
      .limit(50);

    if (!letters || letters.length === 0) {
      return { dashboard: [], totalCount: 0, unseenCount: 0 };
    }

    // Check which have replies
    const ids = letters.map((l) => l.id);
    const { data: replies } = await supabase
      .from("letters")
      .select("in_reply_to")
      .in("in_reply_to", ids);
    const repliedSet = new Set((replies ?? []).map((r) => r.in_reply_to));

    const enriched: HeoLetter[] = letters.map((l) => ({
      ...l,
      hasReply: repliedSet.has(l.id),
    }));

    const unseenCount = enriched.filter((l) => !l.seen_at).length;

    // Dashboard filter: unseen OR within last 2 days
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const dashboardAll = enriched.filter(
      (l) => !l.seen_at || l.delivered_at >= twoDaysAgo
    );

    // Sort: unseen first, then by date desc
    dashboardAll.sort((a, b) => {
      if (!a.seen_at && b.seen_at) return -1;
      if (a.seen_at && !b.seen_at) return 1;
      return new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime();
    });

    return {
      dashboard: dashboardAll.slice(0, 5),
      totalCount: enriched.length,
      unseenCount,
    };
  } catch {
    return { dashboard: [], totalCount: 0, unseenCount: 0 };
  }
}

async function fetchPendingPages(): Promise<{ id: string; title_vi: string; scheduled_for: string; status: string }[]> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return [];

    const { data } = await supabase
      .from("daily_pages")
      .select("id, title_vi, scheduled_for, status")
      .eq("for_user", heo.id)
      .in("status", ["draft", "approved"])
      .order("scheduled_for", { ascending: true })
      .limit(10);

    return data ?? [];
  } catch {
    return [];
  }
}

type TodayActivity = {
  pageCompleted: boolean;
  pageTitle: string | null;
  vocabSaved: number;
  asksToday: number;
};

async function fetchTodayActivity(): Promise<TodayActivity> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return { pageCompleted: false, pageTitle: null, vocabSaved: 0, asksToday: 0 };

    const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
    const todayStart = `${todayVN}T00:00:00+07:00`;

    const [pageRes, vocabRes, askRes] = await Promise.all([
      supabase
        .from("daily_pages")
        .select("title_vi, completed_at")
        .eq("for_user", heo.id)
        .gte("completed_at", todayStart)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("vocabulary")
        .select("id", { count: "exact", head: true })
        .eq("user_id", heo.id)
        .gte("created_at", todayStart),
      supabase
        .from("ask_masuri_threads")
        .select("id", { count: "exact", head: true })
        .eq("from_user", heo.id)
        .gte("created_at", todayStart),
    ]);

    return {
      pageCompleted: Boolean(pageRes.data?.completed_at),
      pageTitle: (pageRes.data?.title_vi as string) ?? null,
      vocabSaved: vocabRes.count ?? 0,
      asksToday: askRes.count ?? 0,
    };
  } catch {
    return { pageCompleted: false, pageTitle: null, vocabSaved: 0, asksToday: 0 };
  }
}

async function fetchStreak(): Promise<{ current: number; longest: number; activeToday: boolean; restDays: number }> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return { current: 0, longest: 0, activeToday: false, restDays: 1 };

    const { data } = await supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_active_date, rest_days_remaining")
      .eq("user_id", heo.id)
      .maybeSingle();

    const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
    return {
      current: data?.current_streak ?? 0,
      longest: data?.longest_streak ?? 0,
      activeToday: data?.last_active_date === todayVN,
      restDays: data?.rest_days_remaining ?? 1,
    };
  } catch {
    return { current: 0, longest: 0, activeToday: false, restDays: 1 };
  }
}

export default async function MasuriNotebookPage() {
  const t = await getTranslations("notebook.home");
  const [streak, pendingDrafts, heoLetterData, todayActivity] = await Promise.all([
    fetchStreak(),
    fetchPendingPages(),
    fetchHeoLetters(),
    fetchTodayActivity(),
  ]);

  return (
    <div style={PAPER_BG} className="min-h-dvh px-5 pb-8 pt-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        <Pig pose="cheering" size={72} animate />
        <div>
          <h1
            className="text-2xl font-bold text-ink leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("masuriTitle")}
          </h1>
          <p className="text-sm text-ink-soft mt-0.5">{t("masuriSubtitle")}</p>
        </div>
      </div>

      {/* ── Draft / approved pages banner ───────────────────── */}
      {pendingDrafts.length > 0 && (
        <div className="mb-4">
          <div className="space-y-2">
            {pendingDrafts.slice(0, 3).map((p) => {
              const isDraft = p.status === "draft";
              return (
                <Link
                  key={p.id}
                  href={`/m/notebook/approve/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform"
                  style={
                    isDraft
                      ? { background: "linear-gradient(135deg, #FFC9D5 0%, #F8A8BC 100%)", boxShadow: "0 4px 14px rgba(209,77,111,0.25)" }
                      : { background: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)", boxShadow: "0 4px 14px rgba(16,185,129,0.15)" }
                  }
                >
                  <span className="text-xl">{isDraft ? "📓" : "✅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isDraft ? "text-rose-800" : "text-green-800"}`}>
                      {p.title_vi}
                    </p>
                    <p className={`text-xs ${isDraft ? "text-rose-600" : "text-green-600"}`}>
                      {p.scheduled_for} · {isDraft ? "chờ duyệt" : "đã duyệt · chờ phát hành 6am"}
                    </p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${isDraft ? "text-rose-600" : "text-green-600"}`}>
                    {isDraft ? "Duyệt →" : "Xem →"}
                  </span>
                </Link>
              );
            })}
          </div>
          {/* Link to full review list */}
          <Link
            href="/masuri/notebook/review"
            className="flex items-center justify-center gap-1.5 mt-2 py-2 rounded-xl text-xs font-semibold text-rose-500 active:opacity-60"
            style={{ backgroundColor: "rgba(255,201,213,0.12)", border: "1px dashed rgba(255,201,213,0.5)" }}
          >
            <span>Xem tất cả trang ({pendingDrafts.length})</span>
            <span>→</span>
          </Link>
        </div>
      )}

      {/* ── Today's status card ─────────────────────────────── */}
      <StatusCard streak={streak} />

      {/* ── I2: Today activity summary ──────────────────────── */}
      <TodayActivityCard activity={todayActivity} />

      {/* ── Quick actions ───────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 mb-4"
        style={{
          backgroundColor: "#FAF1EA",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Tape color="butter" width={14} length={48} rotate={-2} />
          <h2 className="text-base font-bold text-ink ml-2">Hành động nhanh</h2>
        </div>

        <div className="flex flex-col gap-3">
          {/* Send encouragement — full page */}
          <QuickAction
            href="/masuri/notebook/encourage"
            emoji="💕"
            label="Gửi động lực cho Heo"
          />

          {/* Grant rest day to Heo */}
          <MasuriGrantRestButton currentRestDays={streak.restDays} />

          {/* Vocab card */}
          <QuickAction
            href="/masuri/notebook/card/new"
            emoji="📖"
            label="Viết thiệp từ vựng cho Heo"
          />

          {/* Review queued pages */}
          <QuickAction
            href="/masuri/notebook/review"
            emoji="📋"
            label="Duyệt trang học"
            note={pendingDrafts.length > 0 ? `${pendingDrafts.length} chờ duyệt` : undefined}
          />

          {/* Progress */}
          <QuickAction
            href="/masuri/notebook/progress"
            emoji="📊"
            label={t("viewProgress")}
          />
        </div>
      </div>

      {/* ── Heo's letters ─────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ backgroundColor: "#FFFFFF", boxShadow: "var(--shadow)", transform: "rotate(-0.5deg)" }}
      >
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tape color="lilac" width={14} length={48} rotate={0.5} />
            <span style={{ fontSize: 16 }}>💌</span>
            <h2 className="text-base font-bold text-ink">Thư của Heo</h2>
            {heoLetterData.unseenCount > 0 && (
              <span
                className="text-xs font-bold text-white px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "#E97A95", fontSize: 10 }}
              >
                {heoLetterData.unseenCount} mới
              </span>
            )}
          </div>
          {heoLetterData.totalCount > 0 && (
            <Link
              href="/masuri/notebook/letter"
              className="text-xs font-medium text-rose-400 active:opacity-60 shrink-0"
            >
              Xem tất cả ({heoLetterData.totalCount}) →
            </Link>
          )}
        </div>

        {heoLetterData.dashboard.length === 0 ? (
          <p className="text-sm text-ink-soft text-center py-2">
            Không có thư nào gần đây 🌸
          </p>
        ) : (
          <div className="space-y-1.5">
            {heoLetterData.dashboard.map((l) => {
              const unseen = !l.seen_at;
              return (
                <Link
                  key={l.id}
                  href={`/masuri/notebook/letter/${l.id}`}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 active:scale-[0.98] transition-transform"
                  style={{
                    backgroundColor: unseen
                      ? "rgba(255,201,213,0.15)"
                      : "rgba(245,245,245,0.6)",
                    border: unseen
                      ? "1px solid rgba(255,201,213,0.5)"
                      : "1px solid rgba(220,220,220,0.4)",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{l.kind === "two_truths" ? "🎭" : "📨"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">
                      {l.kind === "two_truths" ? "Two Truths and a Lie" : "Thư tuần này"}
                    </p>
                    <p className="text-xs text-ink-soft truncate">
                      {l.body.slice(0, 45)}{l.body.length > 45 ? "…" : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {unseen && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: "#E97A95" }}
                      />
                    )}
                    <span
                      className="text-xs font-semibold"
                      style={{ color: l.hasReply ? "#8B5CF6" : unseen ? "#E97A95" : "#aaa" }}
                    >
                      {l.hasReply ? "✓ Đã trả lời" : "Chưa trả lời"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Ask Masuri inbox ───────────────────────────────── */}
      <SectionCard
        tape="mint"
        title="Câu hỏi của Heo"
        icon="❓"
        rotate={0.5}
      >
        <MasuriAskInbox />
      </SectionCard>

      {/* ── Decorative stickers ─────────────────────────────── */}
      <div className="flex justify-center gap-6 mt-8 opacity-35">
        <Sticker type="star_filled" size={24} />
        <Sticker type="sparkle" size={22} />
        <Sticker type="flower_rose" size={26} />
      </div>
    </div>
  );
}

// ── Today status card ─────────────────────────────────────────
function StatusCard({
  streak,
}: {
  streak: { current: number; longest: number; activeToday: boolean; restDays: number };
}) {
  return (
    <div
      className="rounded-2xl p-5 mb-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FFC9D5 0%, #F8A8BC 100%)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="absolute top-[-8px] right-6">
        <Tape color="pink" width={16} length={56} rotate={-3} />
      </div>

      <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">
        HEO HÔM NAY
      </p>

      <div className="space-y-2">
        <StatusRow
          icon={streak.activeToday ? "✅" : "📓"}
          text={streak.activeToday ? "Đã học hôm nay rồi 🌸" : "Chưa mở trang hôm nay"}
          dim={!streak.activeToday}
        />
        <StatusRow
          icon="🔥"
          text={
            streak.current > 0
              ? `Streak: ${streak.current} ngày${streak.current === streak.longest && streak.current > 1 ? " 🏆" : ""}`
              : "Streak: 0 ngày"
          }
        />
        {streak.longest > 1 && (
          <StatusRow icon="⭐" text={`Kỷ lục: ${streak.longest} ngày`} dim />
        )}
        <StatusRow
          icon="🌸"
          text={`Ngày nghỉ còn lại: ${streak.restDays}`}
          dim={streak.restDays === 0}
        />
      </div>
    </div>
  );
}

function StatusRow({ icon, text, dim = false }: { icon: string; text: string; dim?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${dim ? "opacity-55" : ""}`}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <p className="text-sm font-medium text-ink">{text}</p>
    </div>
  );
}

// ── Today activity card (I2) ─────────────────────────────────
function TodayActivityCard({ activity }: { activity: TodayActivity }) {
  const { pageCompleted, pageTitle, vocabSaved, asksToday } = activity;
  const hasAnyActivity = pageCompleted || vocabSaved > 0 || asksToday > 0;

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        backgroundColor: "rgba(237,232,245,0.5)",
        border: "1px solid rgba(196,168,220,0.35)",
        boxShadow: "var(--shadow)",
      }}
    >
      <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">
        HÔM NAY HEO ĐÃ
      </p>

      {!hasAnyActivity ? (
        <p className="text-sm text-ink-soft italic">Heo chưa làm gì hôm nay... 😴</p>
      ) : (
        <div className="space-y-2">
          <ActivityRow
            icon={pageCompleted ? "✅" : "📓"}
            text={
              pageCompleted
                ? `Hoàn thành trang học${pageTitle ? ` "${pageTitle}"` : ""}`
                : "Chưa học trang hôm nay"
            }
            dim={!pageCompleted}
          />
          <ActivityRow
            icon="📖"
            text={
              vocabSaved > 0
                ? `Lưu ${vocabSaved} từ vựng mới`
                : "Chưa lưu từ nào"
            }
            dim={vocabSaved === 0}
          />
          {asksToday > 0 && (
            <ActivityRow
              icon="💬"
              text={`Hỏi Masuri ${asksToday} câu`}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ icon, text, dim = false }: { icon: string; text: string; dim?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${dim ? "opacity-45" : ""}`}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <p className="text-sm text-ink">{text}</p>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────
function SectionCard({
  tape,
  title,
  icon,
  rotate,
  children,
}: {
  tape: "pink" | "mint" | "butter" | "lilac";
  title: string;
  icon: string;
  rotate: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: "var(--shadow)",
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "center center",
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <Tape color={tape} width={14} length={48} rotate={rotate * -1} />
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 className="text-base font-bold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Quick action row ──────────────────────────────────────────
function QuickAction({
  href,
  emoji,
  label,
  dimmed = false,
  note,
}: {
  href: string;
  emoji: string;
  label: string;
  dimmed?: boolean;
  note?: string;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl ${dimmed ? "opacity-45" : "bg-rose-50"}`}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span className="flex-1 text-sm font-medium text-ink">{label}</span>
      {note && <span className="text-xs text-rose-300 font-medium">{note}</span>}
      {!dimmed && <span className="text-rose-400 text-sm">→</span>}
    </div>
  );

  if (dimmed || href === "#") {
    return <div className="cursor-default">{inner}</div>;
  }

  return (
    <Link href={href} className="block active:scale-[0.98] transition-transform duration-100">
      {inner}
    </Link>
  );
}
