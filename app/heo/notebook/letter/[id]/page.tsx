/**
 * /heo/notebook/letter/[id] — View a letter + Masuri's reply
 */
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Tape } from "@/components/notebook/Tape";
import { LetterSeenMarker } from "@/components/notebook/LetterSeenMarker";
import { ThankButton } from "@/components/notebook/ThankButton";
import Link from "next/link";

export const revalidate = 30;

type Correction = { original_en: string; suggested_en: string; vi_explanation: string };

async function fetchLetter(id: string) {
  try {
    const supabase = createServerClient();
    const { data: letter } = await supabase
      .from("letters")
      .select("id, from_user, to_user, kind, body, in_reply_to, attachments, delivered_at, seen_at, created_at")
      .eq("id", id)
      .single();

    if (!letter) return null;

    const { data: reply } = await supabase
      .from("letters")
      .select("id, body, attachments, delivered_at, created_at")
      .eq("in_reply_to", id)
      .maybeSingle();

    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();

    return { letter, reply, heoId: heo?.id };
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function kindTitle(kind: string) {
  if (kind === "two_truths") return "🎭 Two Truths and a Lie";
  if (kind === "weekly_letter") return "📨 Thư tuần này";
  if (kind === "encouragement") return "💕 Động viên từ Masuri";
  if (kind === "vocab_card") return "📖 Thiệp từ vựng";
  return "💌 Thư";
}

export default async function LetterViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchLetter(id);
  if (!result) notFound();

  const { letter, reply, heoId } = result;
  const fromHeo = letter.from_user === heoId;
  const needsSeen = !fromHeo && !letter.seen_at;
  const corrections = (reply?.attachments as { corrections?: Correction[] } | null)?.corrections ?? [];
  const twoTruthsGuess = (reply?.attachments as { two_truths_guess?: number } | null)?.two_truths_guess;

  return (
    <div className="min-h-dvh pb-8" style={{ backgroundColor: "#FFF9F5" }}>
      {/* Auto-mark seen */}
      {needsSeen && <LetterSeenMarker id={id} />}

      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex items-center gap-3">
        <Link href="/heo/notebook/letter" className="text-ink-soft text-sm">← Hộp thư</Link>
        <h1 className="text-base font-bold text-ink flex-1 truncate">
          {kindTitle(letter.kind)}
        </h1>
      </div>

      <div className="px-5 space-y-5">
        {/* ── Heo's letter ─────────────────────────────────── */}
        <div
          className="relative rounded-2xl px-5 py-5 overflow-hidden"
          style={{
            backgroundColor: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(255,201,213,0.4)",
            boxShadow: "var(--polaroid-shadow)",
          }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Tape color="lilac" width={16} length={56} rotate={-1} />
          </div>

          <p className="text-xs text-ink-soft mb-3 mt-1">{formatDate(letter.delivered_at)}</p>

          {letter.kind === "two_truths" ? (
            <TwoTruthsView body={letter.body} lieIndex={
              (letter.attachments as { truths_lie_index?: number } | null)?.truths_lie_index ?? null
            } masuriGuess={twoTruthsGuess ?? null} />
          ) : (
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{letter.body}</p>
          )}
        </div>

        {/* ── Masuri's reply ────────────────────────────────── */}
        {reply ? (
          <div>
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2 px-1">
              Masuri trả lời
            </p>
            <div
              className="relative rounded-2xl px-5 py-5 overflow-hidden"
              style={{
                backgroundColor: "rgba(237,232,245,0.5)",
                border: "1px solid rgba(196,168,220,0.4)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="absolute top-0 right-6 -translate-y-1/2">
                <Tape color="lilac" width={14} length={48} rotate={2} />
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap mt-1"
                 style={{ fontFamily: "var(--font-handwritten)", fontSize: 16, color: "#4B3A5A" }}>
                {reply.body}
              </p>
              <p className="text-xs text-ink-soft mt-3">{formatDate(reply.delivered_at)}</p>
            </div>

            {/* Corrections */}
            {corrections.length > 0 && (
              <div className="mt-3 rounded-2xl px-4 py-4"
                   style={{ backgroundColor: "rgba(255,249,245,0.9)", border: "1px solid rgba(255,201,213,0.3)" }}>
                <p className="text-xs font-semibold text-rose-400 mb-3">
                  ✨ Masuri gợi ý
                </p>
                <div className="space-y-3">
                  {corrections.map((c, i) => (
                    <div key={i}>
                      <p className="text-xs text-ink-soft line-through">{c.original_en}</p>
                      <p className="text-sm font-medium text-ink mt-0.5">→ {c.suggested_en}</p>
                      <p className="text-xs text-rose-400 mt-0.5">{c.vi_explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thank button */}
            <ThankButton letterId={id} />
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-ink-soft">
            <span className="text-2xl block mb-2">⏳</span>
            Đang chờ Masuri trả lời...
          </div>
        )}
      </div>
    </div>
  );
}

// ── Two truths display ────────────────────────────────────────
function TwoTruthsView({
  body, lieIndex, masuriGuess,
}: {
  body: string;
  lieIndex: number | null;
  masuriGuess: number | null;
}) {
  const sentences = body.split("\n").filter(Boolean);
  return (
    <div className="space-y-2">
      {sentences.map((s, i) => {
        const n = i + 1;
        const isLie = lieIndex === n;
        return (
          <div key={i} className="flex items-start gap-2">
            <span className="text-xs font-bold text-ink-soft w-4 shrink-0 mt-0.5">{n}.</span>
            <p className="text-sm text-ink leading-relaxed flex-1">{s}</p>
            {isLie && (
              <span className="text-xs bg-rose-100 text-rose-500 font-medium px-2 py-0.5 rounded-full shrink-0">
                Bịa 🎭
              </span>
            )}
          </div>
        );
      })}
      {masuriGuess !== null && (
        <p className="text-xs text-ink-soft mt-2 pt-2 border-t border-rose-100">
          Masuri đoán câu {masuriGuess} là bịa —{" "}
          {masuriGuess === lieIndex
            ? "đoán đúng rồi! 🎉"
            : "đoán sai rồi 😂 Heo thắng!"}
        </p>
      )}
    </div>
  );
}

