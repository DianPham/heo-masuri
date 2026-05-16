/**
 * /masuri/notebook/progress — Heo's learning progress, as seen by Masuri.
 * Shows streak, vocab book, completed pages, ask history.
 */
import { createServerClient } from "@/lib/supabase/server";
import { Tape } from "@/components/notebook/Tape";
import { Sticker } from "@/components/notebook/Sticker";
import Link from "next/link";

export const revalidate = 60;

const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

async function fetchProgress() {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return null;

    const [streakRes, vocabRes, pagesRes, asksRes] = await Promise.all([
      supabase
        .from("streaks")
        .select("current_streak, longest_streak, last_active_date, rest_days_remaining")
        .eq("user_id", heo.id)
        .maybeSingle(),
      supabase
        .from("vocabulary")
        .select("id, word_en, word_vi, self_confidence, source_kind, saved_at", { count: "exact" })
        .eq("user_id", heo.id)
        .order("saved_at", { ascending: false })
        .limit(5),
      supabase
        .from("daily_pages")
        .select("id, title_vi, topic, completed_at", { count: "exact" })
        .eq("for_user", heo.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5),
      supabase
        .from("ask_masuri_threads")
        .select("id, question_text, replied_at, created_at")
        .eq("from_user_id", heo.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
    const streak = streakRes.data;

    return {
      streak: {
        current: streak?.current_streak ?? 0,
        longest: streak?.longest_streak ?? 0,
        lastActiveDate: streak?.last_active_date ?? null,
        restDays: streak?.rest_days_remaining ?? 1,
        activeToday: streak?.last_active_date === todayVN,
      },
      vocabTotal: vocabRes.count ?? 0,
      recentVocab: vocabRes.data ?? [],
      pagesTotal: pagesRes.count ?? 0,
      recentPages: (pagesRes.data ?? []).map((p) => ({
        id: p.id,
        completed_at: p.completed_at as string,
        title_vi: (p.title_vi as string) ?? "Trang học",
        topic: (p.topic as string) ?? "",
      })),
      recentAsks: (asksRes.data ?? []).map((a) => ({
        id: a.id as string,
        question_text: a.question_text as string,
        answered_at: a.replied_at as string | null,
        created_at: a.created_at as string,
      })),
    };
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

const TOPIC_EMOJI: Record<string, string> = {
  greeting: "👋",
  feelings: "💭",
  food: "🍜",
  travel: "✈️",
  daily: "☀️",
  weather: "🌤",
  work: "💼",
  review: "🔁",
};

export default async function MasuriProgressPage() {
  const data = await fetchProgress();

  return (
    <div style={PAPER_BG} className="min-h-dvh pb-8">
      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex items-center gap-3">
        <Link href="/masuri/notebook" className="text-ink-soft text-sm">← Sổ</Link>
        <h1 className="text-base font-bold text-ink flex-1">Tiến trình của Heo</h1>
      </div>

      {data === null ? (
        <div className="text-center pt-16 text-ink-soft text-sm">Không tải được dữ liệu 😢</div>
      ) : (
        <div className="px-5 space-y-4">

          {/* ── Streak card ─────────────────────────────────── */}
          <div
            className="relative rounded-2xl p-5 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #FFC9D5 0%, #F8A8BC 100%)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="absolute top-[-8px] right-6">
              <Tape color="pink" width={56} length={16} rotate={-3} />
            </div>
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-4">
              Streak 🔥
            </p>
            <div className="grid grid-cols-3 gap-3">
              <StatBox
                value={data.streak.current}
                label="Ngày hiện tại"
                accent={data.streak.activeToday}
              />
              <StatBox value={data.streak.longest} label="Kỷ lục" />
              <StatBox value={data.streak.restDays} label="Ngày nghỉ còn" dim />
            </div>
            <p className="text-xs text-rose-700 mt-3 opacity-80">
              {data.streak.activeToday
                ? "✅ Heo đã học hôm nay rồi 🌸"
                : "📓 Heo chưa mở trang hôm nay"}
            </p>
          </div>

          {/* ── Vocab ───────────────────────────────────────── */}
          <Section tape="butter" title="Sổ từ vựng" icon="📖">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
                {data.vocabTotal}
              </span>
              <span className="text-sm text-ink-soft">từ đã lưu</span>
            </div>
            {data.recentVocab.length > 0 ? (
              <div className="space-y-1.5">
                {data.recentVocab.map((w) => (
                  <div key={w.id} className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink flex-1">
                      {w.word_en}
                    </span>
                    <span className="text-xs text-ink-soft">{w.word_vi}</span>
                    {w.source_kind === "masuri_card" && (
                      <span className="text-xs text-rose-400 font-medium">Masuri 🐷</span>
                    )}
                    {w.self_confidence === 1 && (
                      <span className="text-xs">✨</span>
                    )}
                  </div>
                ))}
                {data.vocabTotal > 5 && (
                  <p className="text-xs text-ink-soft pt-1">
                    + {data.vocabTotal - 5} từ khác nữa
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">Chưa có từ nào 🌱</p>
            )}
          </Section>

          {/* ── Pages completed ─────────────────────────────── */}
          <Section tape="mint" title="Trang đã hoàn thành" icon="✅">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
                {data.pagesTotal}
              </span>
              <span className="text-sm text-ink-soft">trang</span>
            </div>
            {data.recentPages.length > 0 ? (
              <div className="space-y-1.5">
                {data.recentPages.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span style={{ fontSize: 14 }}>
                      {TOPIC_EMOJI[p.topic] ?? "📓"}
                    </span>
                    <span className="text-sm text-ink flex-1 truncate">{p.title_vi}</span>
                    <span className="text-xs text-ink-soft shrink-0">
                      {formatDate(p.completed_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">Chưa hoàn thành trang nào 🌱</p>
            )}
          </Section>

          {/* ── Ask history ─────────────────────────────────── */}
          <Section tape="lilac" title="Câu hỏi đã hỏi" icon="❓">
            {data.recentAsks.length > 0 ? (
              <div className="space-y-2">
                {data.recentAsks.map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <span className="text-xs shrink-0 mt-0.5">
                      {a.answered_at ? "✅" : "⏳"}
                    </span>
                    <p className="text-sm text-ink leading-relaxed">{a.question_text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">Heo chưa hỏi câu nào 🌸</p>
            )}
          </Section>

          {/* ── Decorative ─────────────────────────────────── */}
          <div className="flex justify-center gap-6 pt-4 opacity-30">
            <Sticker type="star_filled" size={22} />
            <Sticker type="sparkle" size={20} />
            <Sticker type="flower_rose" size={24} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat box ──────────────────────────────────────────────────
function StatBox({
  value,
  label,
  accent = false,
  dim = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center ${dim ? "opacity-60" : ""}`}
      style={{ backgroundColor: "rgba(255,255,255,0.5)" }}
    >
      <p
        className={`text-2xl font-bold leading-tight ${accent ? "text-rose-600" : "text-rose-800"}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="text-xs text-rose-700 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────
function Section({
  tape,
  title,
  icon,
  children,
}: {
  tape: "pink" | "mint" | "butter" | "lilac";
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Tape color={tape} width={40} length={12} rotate={-1} />
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 className="text-base font-bold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}
