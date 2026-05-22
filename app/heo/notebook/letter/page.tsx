/**
 * /heo/notebook/letter — Letter inbox (CP9)
 * Three clear statuses per item:
 *   new_reply  — Masuri replied, Heo hasn't read it yet  (most prominent)
 *   waiting    — Heo sent, no reply yet                  (muted)
 *   read       — answered + Heo read it, or direct seen  (subdued)
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

// ── Types ─────────────────────────────────────────────────────

type Status = "new_reply" | "waiting" | "read";

type Letter = {
  _type: "letter";
  id: string;
  from_user: string;
  kind: string;
  body: string;
  delivered_at: string;
  seen_at: string | null;
  hasReply: boolean;
  replySeen: boolean;
  replyDate: string | null; // when Masuri replied (for sorting)
  status: Status;
  sortDate: string;
};

type AskReply = {
  _type: "ask";
  id: string;
  context_word: string | null;
  question_note: string;
  reply_text: string;
  replied_at: string;
  seen_at: string | null;
  status: Status;
  sortDate: string;
};

type FeedItem = Letter | AskReply;

// ── Data ──────────────────────────────────────────────────────

async function fetchFeed(): Promise<{ items: FeedItem[]; heoId: string | null }> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return { items: [], heoId: null };

    const [lettersRes, asksRes] = await Promise.all([
      supabase
        .from("letters")
        .select("id, from_user, to_user, kind, body, delivered_at, seen_at, created_at")
        .or(`to_user.eq.${heo.id},from_user.eq.${heo.id}`)
        .lte("delivered_at", new Date().toISOString())
        .is("in_reply_to", null)
        .order("delivered_at", { ascending: false })
        .limit(50),
      supabase
        .from("ask_masuri_threads")
        .select("id, context_word, question_note, reply_text, replied_at, seen_at")
        .eq("from_user", heo.id)
        .not("reply_text", "is", null)
        .order("replied_at", { ascending: false })
        .limit(30),
    ]);

    const letterData = lettersRes.data ?? [];
    const askData = asksRes.data ?? [];

    // Fetch reply rows (inc. seen_at + delivered_at) to determine read status
    const repliedSet = new Set<string>();
    const replySeenMap = new Map<string, boolean>();
    const replyDateMap = new Map<string, string>();

    if (letterData.length > 0) {
      const ids = letterData.map((l) => l.id);
      const { data: replyRows } = await supabase
        .from("letters")
        .select("in_reply_to, seen_at, delivered_at")
        .in("in_reply_to", ids);

      for (const r of replyRows ?? []) {
        if (r.in_reply_to) {
          repliedSet.add(r.in_reply_to);
          replySeenMap.set(r.in_reply_to, r.seen_at != null);
          replyDateMap.set(r.in_reply_to, r.delivered_at);
        }
      }
    }

    const letters: Letter[] = letterData.map((l) => {
      const fromHeo = l.from_user === heo.id;
      const hasReply = repliedSet.has(l.id);
      const replySeen = replySeenMap.get(l.id) ?? false;
      const replyDate = replyDateMap.get(l.id) ?? null;

      let status: Status;
      if (fromHeo) {
        status = !hasReply ? "waiting" : !replySeen ? "new_reply" : "read";
      } else {
        // Direct letter from Masuri (encouragement, vocab_card, etc.)
        status = !l.seen_at ? "new_reply" : "read";
      }

      // Sort: new_reply uses reply date (show latest reply at top), others use delivered_at
      const sortDate = status === "new_reply" && replyDate ? replyDate : l.delivered_at;

      return {
        _type: "letter" as const,
        id: l.id,
        from_user: l.from_user,
        kind: l.kind,
        body: l.body,
        delivered_at: l.delivered_at,
        seen_at: l.seen_at,
        hasReply,
        replySeen,
        replyDate,
        status,
        sortDate,
      };
    });

    const asks: AskReply[] = askData
      .filter((a) => a.reply_text && a.replied_at)
      .map((a) => ({
        _type: "ask" as const,
        id: a.id,
        context_word: a.context_word,
        question_note: a.question_note,
        reply_text: a.reply_text!,
        replied_at: a.replied_at!,
        seen_at: a.seen_at,
        status: (!a.seen_at ? "new_reply" : "read") as Status,
        sortDate: a.replied_at!,
      }));

    // Group by status priority, sort by date desc within each group
    const allItems: FeedItem[] = [...letters, ...asks];
    const order: Status[] = ["new_reply", "waiting", "read"];

    const sorted = allItems.sort((a, b) => {
      const ai = order.indexOf(a.status);
      const bi = order.indexOf(b.status);
      if (ai !== bi) return ai - bi;
      return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
    });

    return { items: sorted, heoId: heo.id };
  } catch {
    return { items: [], heoId: null };
  }
}

// ── Helpers ───────────────────────────────────────────────────

function isSunday(): boolean {
  return new Date(Date.now() + 7 * 3_600_000).getDay() === 0;
}

function kindMeta(kind: string, fromHeo: boolean): { icon: string; label: string } {
  if (kind === "two_truths")    return fromHeo ? { icon: "🎭", label: "Two Truths của Heo" }  : { icon: "🎭", label: "Masuri trả lời Two Truths" };
  if (kind === "weekly_letter") return fromHeo ? { icon: "📨", label: "Thư của Heo" }          : { icon: "💌", label: "Thư từ Masuri" };
  if (kind === "encouragement") return { icon: "💕", label: "Động viên từ Masuri" };
  if (kind === "vocab_card")    return { icon: "📖", label: "Thiệp từ vựng từ Masuri" };
  return { icon: "✉️", label: "Thư" };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const dVN = new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  if (dVN === todayVN) return "Hôm nay";
  return d.toLocaleDateString("vi-VN", { day: "numeric", month: "long", timeZone: "Asia/Ho_Chi_Minh" });
}

// ── Page ──────────────────────────────────────────────────────

export default async function LetterPage() {
  const { items, heoId } = await fetchFeed();
  const sunday = isSunday();

  const newCount = items.filter((i) => i.status === "new_reply").length;

  // Split into three buckets
  const newItems    = items.filter((i) => i.status === "new_reply");
  const waitItems   = items.filter((i) => i.status === "waiting");
  const readItems   = items.filter((i) => i.status === "read");

  return (
    <div style={PAPER_BG} className="min-h-dvh">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative px-5 pt-10 pb-4">
        <Link href="/heo/notebook" className="absolute left-5 top-11 text-ink-soft text-sm">
          ← Sổ
        </Link>
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <Tape color="lilac" width={22} length={100} rotate={-1} />
        </div>
        <h1
          className="text-3xl font-bold text-ink text-center mt-4"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Thư & Trả lời
        </h1>
        {newCount > 0 && (
          <p className="text-center text-xs text-rose-400 font-medium mt-1">
            {newCount} tin mới chưa đọc 💌
          </p>
        )}
      </div>

      <div className="px-5 pb-10 space-y-5">

        {/* ── Write button ──────────────────────────────────── */}
        {sunday ? (
          <Link href="/heo/notebook/letter/write" className="block active:scale-[0.98] transition-transform">
            <div
              className="relative rounded-2xl p-5 overflow-hidden"
              style={{ background: "linear-gradient(135deg, #EDE8F5 0%, #D7C9E8 100%)", boxShadow: "var(--shadow-card)" }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Tape color="lilac" width={16} length={56} rotate={2} />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span style={{ fontSize: 36 }}>📨</span>
                <div>
                  <p className="text-sm font-bold text-purple-800">Lá thư tuần này</p>
                  <p className="text-xs text-purple-600 mt-0.5">Heo kể cho Masuri nghe tuần vừa rồi nha 💕</p>
                </div>
                <span className="ml-auto text-purple-500 font-bold text-sm">Viết →</span>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/heo/notebook/letter/write" className="block active:scale-[0.98] transition-transform">
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(237,232,245,0.4)", border: "1px solid rgba(196,168,220,0.35)" }}
            >
              <span style={{ fontSize: 22 }}>📨</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">Viết thư cho Masuri</p>
                <p className="text-xs text-ink-soft mt-0.5">Kể về tuần này hoặc chơi Two Truths</p>
              </div>
              <span className="text-xs text-purple-400 font-medium">Viết →</span>
            </div>
          </Link>
        )}

        {items.length === 0 && <EmptyState />}

        {/* ── Section: New replies (most prominent) ─────────── */}
        {newItems.length > 0 && (
          <section className="space-y-2.5">
            <SectionLabel tape="lilac" icon="💌" text="Tin mới" count={newItems.length} />
            {newItems.map((item) => (
              item._type === "ask"
                ? <AskCard key={`ask-${item.id}`} item={item} />
                : <LetterCard key={`letter-${item.id}`} item={item} heoId={heoId} />
            ))}
          </section>
        )}

        {/* ── Section: Waiting ──────────────────────────────── */}
        {waitItems.length > 0 && (
          <section className="space-y-2.5">
            <SectionLabel tape="butter" icon="⏳" text="Đang chờ trả lời" count={waitItems.length} />
            {waitItems.map((item) => (
              item._type === "ask"
                ? <AskCard key={`ask-${item.id}`} item={item} />
                : <LetterCard key={`letter-${item.id}`} item={item} heoId={heoId} />
            ))}
          </section>
        )}

        {/* ── Section: Read / archive ───────────────────────── */}
        {readItems.length > 0 && (
          <section className="space-y-2.5">
            <SectionLabel tape="mint" icon="✓" text="Đã đọc" count={readItems.length} />
            {readItems.map((item) => (
              item._type === "ask"
                ? <AskCard key={`ask-${item.id}`} item={item} />
                : <LetterCard key={`letter-${item.id}`} item={item} heoId={heoId} />
            ))}
          </section>
        )}

      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────
function SectionLabel({
  tape, icon, text, count,
}: {
  tape: "pink" | "mint" | "butter" | "lilac";
  icon: string;
  text: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <Tape color={tape} width={10} length={28} rotate={-1} />
      <span style={{ fontSize: 13 }}>{icon}</span>
      <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
        {text}
      </p>
      <span className="text-xs text-ink-soft opacity-60">({count})</span>
    </div>
  );
}

// ── Letter card ───────────────────────────────────────────────
function LetterCard({ item, heoId }: { item: Letter; heoId: string | null }) {
  const fromHeo = item.from_user === heoId;
  const meta = kindMeta(item.kind, fromHeo);

  if (item.status === "new_reply") {
    return (
      <Link
        href={`/heo/notebook/letter/${item.id}`}
        className="block active:scale-[0.98] transition-transform"
      >
        <div
          className="rounded-2xl px-4 py-4"
          style={{
            backgroundColor: "rgba(237,232,245,0.95)",
            border: "1.5px solid rgba(167,139,250,0.5)",
            boxShadow: "0 4px 18px rgba(167,139,250,0.18)",
          }}
        >
          {/* New reply banner */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: "#8B5CF6" }}
            >
              💌 Masuri trả lời rồi!
            </span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#8B5CF6" }}
            />
          </div>
          <div className="flex items-start gap-2.5">
            <span style={{ fontSize: 20, flexShrink: 0 }}>{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-purple-600">{meta.label}</p>
              <p className="text-sm text-ink mt-0.5 line-clamp-2 leading-relaxed">{item.body}</p>
              <p className="text-xs text-ink-soft mt-1.5">{formatDate(item.delivered_at)}</p>
            </div>
            <span className="text-xs font-bold text-purple-500 shrink-0 mt-0.5 whitespace-nowrap">
              Đọc ngay →
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (item.status === "waiting") {
    return (
      <Link
        href={`/heo/notebook/letter/${item.id}`}
        className="block active:scale-[0.98] transition-transform"
      >
        <div
          className="rounded-2xl px-4 py-3.5"
          style={{
            backgroundColor: "rgba(255,255,255,0.6)",
            border: "1.5px dashed rgba(200,200,200,0.7)",
          }}
        >
          <div className="flex items-start gap-2.5">
            <span style={{ fontSize: 20, flexShrink: 0, opacity: 0.6 }}>{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink-soft">{meta.label}</p>
              <p className="text-sm text-ink mt-0.5 line-clamp-2 leading-relaxed opacity-75">
                {item.body}
              </p>
              <p className="text-xs text-ink-soft mt-1.5 italic opacity-70">
                ⏳ Đang chờ Masuri trả lời... · {formatDate(item.delivered_at)}
              </p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // read
  return (
    <Link
      href={`/heo/notebook/letter/${item.id}`}
      className="block active:scale-[0.98] transition-transform"
    >
      <div
        className="rounded-2xl px-4 py-3"
        style={{
          backgroundColor: "rgba(250,250,250,0.7)",
          border: "1px solid rgba(220,220,220,0.4)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ fontSize: 18, flexShrink: 0, opacity: 0.5 }}>{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-soft truncate">{meta.label}</p>
            <p className="text-xs text-ink-soft truncate opacity-70 mt-0.5">
              {item.body.slice(0, 60)}{item.body.length > 60 ? "…" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-xs text-ink-soft opacity-50">{formatDate(item.delivered_at)}</span>
            <span className="text-xs font-medium" style={{ color: "#8B5CF6", opacity: 0.7 }}>
              ✓ Đã đọc
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Ask card ──────────────────────────────────────────────────
function AskCard({ item }: { item: AskReply }) {
  const preview = item.reply_text.length > 90
    ? item.reply_text.slice(0, 90) + "…"
    : item.reply_text;

  if (item.status === "new_reply") {
    return (
      <Link href="/heo/notebook/ask" className="block active:scale-[0.98] transition-transform">
        <div
          className="rounded-2xl px-4 py-4"
          style={{
            backgroundColor: "rgba(232,242,233,0.95)",
            border: "1.5px solid rgba(100,160,100,0.45)",
            boxShadow: "0 4px 18px rgba(100,160,100,0.12)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-2.5">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: "#3A6B2A" }}
            >
              💬 Masuri trả lời câu hỏi!
            </span>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3A6B2A" }} />
          </div>
          <div className="flex items-start gap-2.5">
            <span style={{ fontSize: 20, flexShrink: 0 }}>❓</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700">
                {item.context_word ? `Về từ "${item.context_word}"` : "Câu hỏi của Heo"}
              </p>
              <p className="text-sm text-ink mt-0.5 leading-relaxed">{preview}</p>
              <p className="text-xs text-ink-soft mt-1.5">{formatDate(item.replied_at)}</p>
            </div>
            <span className="text-xs font-bold text-green-700 shrink-0 mt-0.5 whitespace-nowrap">
              Đọc ngay →
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // read
  return (
    <Link href="/heo/notebook/ask" className="block active:scale-[0.98] transition-transform">
      <div
        className="rounded-2xl px-4 py-3"
        style={{
          backgroundColor: "rgba(250,250,250,0.7)",
          border: "1px solid rgba(220,220,220,0.4)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ fontSize: 18, flexShrink: 0, opacity: 0.5 }}>💬</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-soft truncate">
              {item.context_word ? `Về từ "${item.context_word}"` : "Câu hỏi của Heo"}
            </p>
            <p className="text-xs text-ink-soft truncate opacity-70 mt-0.5">{preview}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-xs text-ink-soft opacity-50">{formatDate(item.replied_at)}</span>
            <span className="text-xs font-medium opacity-70" style={{ color: "#3A6B2A" }}>
              ✓ Đã đọc
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center pt-8 pb-16 px-8">
      <div
        className="relative w-44 h-36 mb-8 flex items-center justify-center rounded-2xl"
        style={{ backgroundColor: "#EDE8F5", boxShadow: "var(--polaroid-shadow)", transform: "rotate(-2deg)" }}
      >
        <div className="absolute top-[-10px] left-1/2 -translate-x-1/2">
          <Tape color="lilac" width={16} length={56} rotate={1} />
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
        Viết thư kể cho Masuri nghe về tuần vừa rồi, hoặc thử chơi Two Truths and a Lie 💕
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
