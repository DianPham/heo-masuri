/**
 * /heo/notebook/letter — Letter inbox (CP9)
 * Shows received letters from Masuri + Heo's own sent weekly letters.
 */
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Pig } from "@/components/theme/Pig";
import { Sticker } from "@/components/notebook/Sticker";
import { Tape } from "@/components/notebook/Tape";

export const revalidate = 60;

const PAPER_BG = {
  backgroundImage: "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

type Letter = {
  id: string;
  from_user: string;
  to_user: string;
  kind: string;
  body: string;
  in_reply_to: string | null;
  delivered_at: string;
  seen_at: string | null;
  created_at: string;
  hasReply: boolean;
};

async function fetchLetters(): Promise<Letter[]> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return [];

    const { data } = await supabase
      .from("letters")
      .select("id, from_user, to_user, kind, body, in_reply_to, delivered_at, seen_at, created_at")
      .or(`to_user.eq.${heo.id},from_user.eq.${heo.id}`)
      .lte("delivered_at", new Date().toISOString())
      .is("in_reply_to", null)        // top-level only (replies shown inside parent)
      .order("delivered_at", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return [];

    // Check which letters have a reply from Masuri
    const ids = data.map((l) => l.id);
    const { data: replies } = await supabase
      .from("letters")
      .select("in_reply_to")
      .in("in_reply_to", ids);

    const repliedSet = new Set((replies ?? []).map((r) => r.in_reply_to));

    return data.map((l) => ({ ...l, hasReply: repliedSet.has(l.id) })) as Letter[];
  } catch {
    return [];
  }
}

function isSunday(): boolean {
  return new Date(Date.now() + 7 * 3_600_000).getDay() === 0;
}

function kindLabel(kind: string, fromHeo: boolean): { icon: string; label: string } {
  if (kind === "weekly_letter" || kind === "two_truths") {
    return fromHeo
      ? { icon: "📨", label: "Thư của Heo" }
      : { icon: "💌", label: "Masuri trả lời" };
  }
  if (kind === "encouragement") return { icon: "💕", label: "Động viên từ Masuri" };
  if (kind === "vocab_card")    return { icon: "📖", label: "Thiệp từ vựng từ Masuri" };
  return { icon: "✉️", label: "Thư" };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "numeric", month: "long", timeZone: "Asia/Ho_Chi_Minh" });
}

export default async function LetterPage() {
  const letters = await fetchLetters();
  const sunday = isSunday();
  const unread = letters.filter((l) => !l.seen_at && l.to_user !== undefined).length;

  return (
    <div style={PAPER_BG} className="min-h-dvh">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative px-5 pt-10 pb-4">
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <Tape color="lilac" width={100} length={22} rotate={-1} />
        </div>
        <h1
          className="text-3xl font-bold text-ink text-center mt-4"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Thư
        </h1>
        {unread > 0 && (
          <p className="text-center text-xs text-rose-400 font-medium mt-1">
            {unread} thư chưa đọc
          </p>
        )}
      </div>

      <div className="px-5 pb-8 space-y-4">
        {/* ── Sunday letter card ────────────────────────────── */}
        {sunday && (
          <Link href="/heo/notebook/letter/write" className="block active:scale-[0.98] transition-transform">
            <div
              className="relative rounded-2xl p-5 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #EDE8F5 0%, #D7C9E8 100%)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Tape color="lilac" width={56} length={16} rotate={2} />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span style={{ fontSize: 36 }}>📨</span>
                <div>
                  <p className="text-sm font-bold text-purple-800">Lá thư tuần này</p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    Heo kể cho Masuri nghe tuần vừa rồi nha 💕
                  </p>
                </div>
                <span className="ml-auto text-purple-500 font-bold text-sm">Viết →</span>
              </div>
            </div>
          </Link>
        )}

        {/* If not Sunday, show a quieter "write" link */}
        {!sunday && (
          <Link
            href="/heo/notebook/letter/write"
            className="flex items-center gap-2 text-sm text-ink-soft px-1"
          >
            <span>📨</span>
            <span className="underline underline-offset-2">Viết thư cho Masuri</span>
          </Link>
        )}

        {/* ── Letter list ───────────────────────────────────── */}
        {letters.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {letters.map((letter) => {
              const fromHeo = letter.kind !== "encouragement" && letter.kind !== "vocab_card";
              const meta = kindLabel(letter.kind, fromHeo);
              // Highlight if: letter from Masuri (unread) OR Heo's letter that got a reply
              const highlight = (!letter.seen_at && !fromHeo) || (fromHeo && letter.hasReply);

              return (
                <Link
                  key={letter.id}
                  href={`/heo/notebook/letter/${letter.id}`}
                  className="block active:scale-[0.98] transition-transform"
                >
                  <div
                    className="relative rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor: highlight ? "rgba(237,232,245,0.7)" : "rgba(255,249,245,0.9)",
                      border: `1px solid ${highlight ? "rgba(196,168,220,0.6)" : "rgba(255,201,213,0.3)"}`,
                      boxShadow: highlight ? "0 2px 12px rgba(196,168,220,0.2)" : undefined,
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink-soft">{meta.label}</p>
                        <p className="text-sm text-ink mt-0.5 line-clamp-2 leading-relaxed">
                          {letter.body}
                        </p>
                        <p className="text-xs text-ink-soft mt-1.5">{formatDate(letter.delivered_at)}</p>
                      </div>
                      {fromHeo && (
                        <span
                          className="text-xs font-semibold shrink-0 mt-0.5"
                          style={{ color: letter.hasReply ? "#8B5CF6" : "#ccc" }}
                        >
                          {letter.hasReply ? "✓ Có trả lời" : "Chờ..."}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center pt-8 pb-16 px-8">
      <div
        className="relative w-44 h-36 mb-8 flex items-center justify-center rounded-2xl"
        style={{ backgroundColor: "#EDE8F5", boxShadow: "var(--polaroid-shadow)", transform: "rotate(-2deg)" }}
      >
        <div className="absolute top-[-10px] left-1/2 -translate-x-1/2">
          <Tape color="lilac" width={56} length={16} rotate={1} />
        </div>
        <span style={{ fontSize: 48 }}>💌</span>
        <div className="absolute -bottom-3 -left-3 -rotate-12 opacity-60">
          <Sticker type="heart_filled" size={20} />
        </div>
      </div>

      <Pig pose="heart-eyes" size={72} animate />

      <p
        className="text-2xl font-bold text-ink text-center mt-6 mb-2"
        style={{ fontFamily: "var(--font-handwritten)" }}
      >
        Chưa có thư nào
      </p>
      <p className="text-sm text-ink-soft text-center mb-6 max-w-xs">
        Mỗi Chủ nhật, Heo có thể viết thư kể về tuần vừa rồi cho Masuri đọc 💕
      </p>

      <Link
        href="/heo/notebook/letter/write"
        className="inline-flex items-center gap-2 bg-purple-400 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl"
        style={{ boxShadow: "0 4px 12px rgba(167,139,250,0.35)" }}
      >
        📨 Viết thư đầu tiên
      </Link>
    </div>
  );
}
