/**
 * /masuri/notebook/letter — Full list of Heo's letters, grouped by day.
 */
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Tape } from "@/components/notebook/Tape";

export const revalidate = 60;

const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

type Letter = {
  id: string;
  kind: string;
  body: string;
  delivered_at: string;
  seen_at: string | null;
  hasReply: boolean;
  dayKey: string; // YYYY-MM-DD in VN timezone
};

type LetterPrompt = {
  prompt_vi: string;
  prompt_en: string;
  starter_words: string[];
};

async function fetchWeeklyPrompt(): Promise<LetterPrompt | null> {
  try {
    const supabase = createServerClient();
    const { data: prompts } = await supabase
      .from("letter_prompts")
      .select("prompt_vi, prompt_en, starter_words")
      .order("id", { ascending: true });

    if (!prompts || prompts.length === 0) return null;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 86_400_000));
    const prompt = prompts[weekNum % prompts.length];

    return {
      prompt_vi: prompt.prompt_vi,
      prompt_en: prompt.prompt_en,
      starter_words: Array.isArray(prompt.starter_words) ? prompt.starter_words : [],
    };
  } catch {
    return null;
  }
}

async function fetchAllLetters(): Promise<Letter[]> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return [];

    const { data: letters } = await supabase
      .from("letters")
      .select("id, kind, body, delivered_at, seen_at")
      .eq("from_user", heo.id)
      .in("kind", ["weekly_letter", "two_truths"])
      .not("delivered_at", "is", null)
      .order("delivered_at", { ascending: false })
      .limit(100);

    if (!letters || letters.length === 0) return [];

    const ids = letters.map((l) => l.id);
    const { data: replies } = await supabase
      .from("letters")
      .select("in_reply_to")
      .in("in_reply_to", ids);
    const repliedSet = new Set((replies ?? []).map((r) => r.in_reply_to));

    return letters.map((l) => ({
      ...l,
      hasReply: repliedSet.has(l.id),
      dayKey: new Date(new Date(l.delivered_at).getTime() + 7 * 3_600_000)
        .toISOString()
        .slice(0, 10),
    }));
  } catch {
    return [];
  }
}

function groupByDay(letters: Letter[]): { dayKey: string; label: string; items: Letter[] }[] {
  const map = new Map<string, Letter[]>();
  for (const l of letters) {
    const group = map.get(l.dayKey) ?? [];
    group.push(l);
    map.set(l.dayKey, group);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest day first
    .map(([dayKey, items]) => ({
      dayKey,
      label: formatDayLabel(dayKey),
      items,
    }));
}

function formatDayLabel(dayKey: string): string {
  const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const yesterdayVN = new Date(Date.now() + 7 * 3_600_000 - 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (dayKey === todayVN) return "Hôm nay";
  if (dayKey === yesterdayVN) return "Hôm qua";
  return new Date(dayKey + "T00:00:00+07:00").toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function MasuriLetterListPage() {
  const [letters, weeklyPrompt] = await Promise.all([
    fetchAllLetters(),
    fetchWeeklyPrompt(),
  ]);
  const groups = groupByDay(letters);
  const unseenCount = letters.filter((l) => !l.seen_at).length;

  return (
    <div style={PAPER_BG} className="min-h-dvh px-5 pb-10">
      {/* Header */}
      <div className="pt-10 pb-6 flex items-center gap-3">
        <Link
          href="/masuri/notebook"
          className="w-8 h-8 rounded-full flex items-center justify-center text-rose-400 active:bg-rose-100"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M11 14 L5 9 L11 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold text-ink leading-tight"
              style={{ fontFamily: "var(--font-handwritten)" }}
            >
              Thư của Heo
            </h1>
            {unseenCount > 0 && (
              <span
                className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#E97A95" }}
              >
                {unseenCount} chưa đọc
              </span>
            )}
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            {letters.length === 0
              ? "Heo chưa viết thư nào 🌸"
              : `${letters.length} lá thư`}
          </p>
        </div>
      </div>

      {/* This week's prompt — so Masuri knows what Heo was asked to write */}
      {weeklyPrompt && (
        <div
          className="rounded-2xl px-4 py-4 mb-6"
          style={{
            backgroundColor: "rgba(237,232,245,0.6)",
            border: "1px solid rgba(196,168,220,0.4)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Tape color="lilac" width={10} length={36} rotate={-1} />
            <p className="text-xs font-bold text-purple-500 uppercase tracking-wide">
              Đề thư tuần này
            </p>
          </div>
          <p className="text-sm font-medium text-ink leading-snug mb-1">
            {weeklyPrompt.prompt_vi}
          </p>
          <p className="text-xs text-ink-soft italic mb-2">{weeklyPrompt.prompt_en}</p>
          {weeklyPrompt.starter_words.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {weeklyPrompt.starter_words.map((w) => (
                <span
                  key={w}
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(196,168,220,0.3)", color: "#6B46A0" }}
                >
                  {w}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grouped list */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center pt-16 text-center">
          <span style={{ fontSize: 48 }}>💌</span>
          <p className="text-base font-semibold text-ink mt-4 mb-1">
            Heo chưa viết thư nào
          </p>
          <p className="text-sm text-ink-soft">Thư sẽ xuất hiện ở đây sau khi Heo gửi 🌸</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ dayKey, label, items }) => (
            <section key={dayKey}>
              {/* Day header */}
              <div className="flex items-center gap-2 mb-2">
                <Tape color="lilac" width={10} length={32} rotate={-1} />
                <p className="text-xs font-bold text-purple-500 uppercase tracking-wide">
                  {label}
                </p>
              </div>

              <div className="space-y-2">
                {items.map((l) => {
                  const unseen = !l.seen_at;
                  return (
                    <Link
                      key={l.id}
                      href={`/masuri/notebook/letter/${l.id}`}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform"
                      style={{
                        backgroundColor: unseen ? "white" : "rgba(250,250,250,0.8)",
                        boxShadow: "var(--shadow)",
                        border: unseen
                          ? "1.5px solid rgba(255,201,213,0.6)"
                          : "1px solid rgba(220,220,220,0.4)",
                      }}
                    >
                      {/* Kind icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                        style={{
                          backgroundColor: unseen
                            ? "rgba(255,201,213,0.2)"
                            : "rgba(237,232,245,0.4)",
                        }}
                      >
                        {l.kind === "two_truths" ? "🎭" : "📨"}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink">
                          {l.kind === "two_truths"
                            ? "Two Truths and a Lie"
                            : "Thư tuần này"}
                        </p>
                        <p className="text-xs text-ink-soft truncate mt-0.5">
                          {l.body.slice(0, 60)}{l.body.length > 60 ? "…" : ""}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {unseen && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: "#E97A95" }}
                          />
                        )}
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color: l.hasReply
                              ? "#8B5CF6"
                              : unseen
                              ? "#E97A95"
                              : "#aaa",
                          }}
                        >
                          {l.hasReply ? "✓ Đã trả lời" : "Chưa trả lời"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
