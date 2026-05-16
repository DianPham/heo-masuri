/**
 * /masuri/notebook/letter/[id] — Masuri reads Heo's letter and replies.
 */
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { Tape } from "@/components/notebook/Tape";
import { MasuriLetterReply } from "@/components/notebook/MasuriLetterReply";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function fetchLetter(id: string) {
  try {
    const supabase = createServerClient();
    const { data: letter } = await supabase
      .from("letters")
      .select("id, from_user, kind, body, attachments, delivered_at, created_at")
      .eq("id", id)
      .single();

    if (!letter) return null;

    // Check if already replied
    const { data: reply } = await supabase
      .from("letters")
      .select("id")
      .eq("in_reply_to", id)
      .maybeSingle();

    return { letter, hasReply: !!reply };
  } catch {
    return null;
  }
}

function kindTitle(kind: string) {
  if (kind === "two_truths") return "🎭 Two Truths and a Lie của Heo";
  return "📨 Thư tuần này của Heo";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default async function MasuriLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchLetter(id);
  if (!result) notFound();

  const { letter, hasReply } = result;
  const sentences = letter.kind === "two_truths"
    ? letter.body.split("\n").filter(Boolean)
    : null;
  const lieIndex = (letter.attachments as { truths_lie_index?: number } | null)?.truths_lie_index ?? null;

  return (
    <div className="min-h-dvh pb-8 px-5" style={{ backgroundColor: "#FFF9F5" }}>
      {/* Header */}
      <div className="pt-10 pb-4 flex items-center gap-3">
        <Link href="/masuri/notebook" className="text-ink-soft text-sm">← Sổ</Link>
        <h1 className="text-base font-bold text-ink flex-1 truncate">
          {kindTitle(letter.kind)}
        </h1>
      </div>

      {/* Heo's letter */}
      <div
        className="relative rounded-2xl px-5 py-5 mb-6 overflow-hidden"
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          border: "1px solid rgba(255,201,213,0.4)",
          boxShadow: "var(--polaroid-shadow)",
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Tape color="pink" width={56} length={16} rotate={-2} />
        </div>
        <p className="text-xs text-ink-soft mb-3 mt-1">{formatDate(letter.delivered_at)}</p>

        {sentences ? (
          // Two truths display for Masuri
          <div className="space-y-2">
            <p className="text-xs text-ink-soft mb-3">
              2 câu thật, 1 câu bịa — Masuri đoán câu nào?
            </p>
            {sentences.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs font-bold text-ink-soft w-4 shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-sm text-ink leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{letter.body}</p>
        )}
      </div>

      {/* Reply form */}
      {hasReply ? (
        <div className="text-center py-8 text-sm text-ink-soft">
          <span className="text-2xl block mb-2">✅</span>
          Masuri đã trả lời rồi 💕
          <br />
          <Link href="/masuri/notebook" className="text-rose-400 underline mt-3 block">
            Quay lại sổ
          </Link>
        </div>
      ) : (
        <MasuriLetterReply
          letterId={id}
          isTwoTruths={letter.kind === "two_truths"}
          lieIndex={lieIndex}
        />
      )}
    </div>
  );
}
