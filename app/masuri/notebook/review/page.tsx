/**
 * /masuri/notebook/review — Full list of pending draft/approved pages.
 * Blueprint CP7 §5: Masuri sees all queued pages, can tap to approve/edit.
 */
import Link from "next/link";
import { Pig } from "@/components/theme/Pig";
import { Tape } from "@/components/notebook/Tape";
import { InfoTip } from "@/components/notebook/InfoTip";
import { PublishButton } from "@/components/notebook/PublishButton";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 30;

const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

interface Page {
  id: string;
  title_vi: string;
  topic: string | null;
  scheduled_for: string;
  status: string;
  generated_by: string;
  created_at: string;
}

async function fetchPendingPages(): Promise<Page[]> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return [];

    const { data } = await supabase
      .from("daily_pages")
      .select("id, title_vi, topic, scheduled_for, status, generated_by, created_at")
      .eq("for_user", heo.id)
      .in("status", ["draft", "approved"])
      .order("scheduled_for", { ascending: true })
      .limit(30);

    return data ?? [];
  } catch {
    return [];
  }
}

const TOPIC_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  daily_life: { bg: "rgba(255,201,213,0.25)", text: "#C4667A", emoji: "🏠" },
  food:        { bg: "rgba(255,220,150,0.25)", text: "#B8860B", emoji: "🍜" },
  travel:      { bg: "rgba(173,216,230,0.25)", text: "#1E6F8E", emoji: "✈️" },
  work:        { bg: "rgba(196,168,220,0.25)", text: "#6B21A8", emoji: "💼" },
  feelings:    { bg: "rgba(255,182,193,0.25)", text: "#C4667A", emoji: "💕" },
  nature:      { bg: "rgba(156,175,136,0.25)", text: "#3A6B2A", emoji: "🌿" },
  cafe:        { bg: "rgba(210,180,140,0.25)", text: "#8B6914", emoji: "☕" },
  shopping:    { bg: "rgba(255,160,122,0.2)", text: "#B85C38", emoji: "🛍️" },
};

function topicStyle(topic: string | null) {
  if (!topic) return { bg: "rgba(200,200,200,0.15)", text: "#888", emoji: "📄" };
  return (
    TOPIC_COLORS[topic] ?? { bg: "rgba(200,200,200,0.15)", text: "#888", emoji: "📄" }
  );
}

function scheduledLabel(dateStr: string) {
  const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const tomorrowVN = new Date(Date.now() + 7 * 3_600_000 + 86_400_000)
    .toISOString()
    .slice(0, 10);

  if (dateStr === todayVN) return { label: "Hôm nay", urgent: true };
  if (dateStr === tomorrowVN) return { label: "Ngày mai", urgent: false };

  const d = new Date(dateStr + "T00:00:00+07:00");
  return {
    label: d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "short" }),
    urgent: false,
  };
}

export default async function MasuriReviewPage() {
  const pages = await fetchPendingPages();

  const drafts = pages.filter((p) => p.status === "draft");
  const approved = pages.filter((p) => p.status === "approved");

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
          <div className="flex items-center gap-1.5">
            <h1
              className="text-2xl font-bold text-ink leading-tight"
              style={{ fontFamily: "var(--font-handwritten)" }}
            >
              Duyệt trang học
            </h1>
            <InfoTip
              text="Quy trình: Draft → Masuri duyệt → Approved → Tự phát hành lúc 6am. Khi duyệt, Masuri có thể chỉnh sửa nội dung hoặc nhấn nút tái tạo."
              position="bottom"
            />
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            {pages.length === 0
              ? "Không có trang nào chờ duyệt 🌸"
              : `${drafts.length} cần duyệt · ${approved.length} đã duyệt`}
          </p>
        </div>
      </div>

      {pages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {/* Drafts — need Masuri's attention */}
          {drafts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Tape color="pink" width={12} length={40} rotate={-1} />
                <h2 className="text-sm font-bold text-rose-600 uppercase tracking-wide">
                  📓 Chờ duyệt ({drafts.length})
                </h2>
              </div>
              <div className="space-y-2">
                {drafts.map((p) => (
                  <PageRow key={p.id} page={p} />
                ))}
              </div>
            </section>
          )}

          {/* Approved — queued, will publish at 6am */}
          {approved.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Tape color="mint" width={12} length={40} rotate={1} />
                <h2 className="text-sm font-bold text-green-700 uppercase tracking-wide">
                  ✅ Đã duyệt ({approved.length})
                </h2>
              </div>
              <div className="space-y-2">
                {approved.map((p) => (
                  <PageRow key={p.id} page={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page row ──────────────────────────────────────────────────
function PageRow({ page }: { page: Page }) {
  const isDraft = page.status === "draft";
  const { bg, text, emoji } = topicStyle(page.topic);
  const { label: schedLabel, urgent } = scheduledLabel(page.scheduled_for);

  return (
    <Link
      href={`/masuri/notebook/review/${page.id}`}
      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform"
      style={{
        backgroundColor: isDraft ? "white" : "rgba(240,255,248,0.8)",
        boxShadow: "var(--shadow)",
        border: isDraft
          ? "1.5px solid rgba(255,201,213,0.5)"
          : "1px solid rgba(156,175,136,0.35)",
      }}
    >
      {/* Topic badge */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
        style={{ backgroundColor: bg }}
      >
        {emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink truncate">{page.title_vi}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: urgent
                ? "rgba(233,122,149,0.15)"
                : "rgba(200,200,200,0.15)",
              color: urgent ? "#C4667A" : "#888",
            }}
          >
            {schedLabel}
          </span>
          {page.generated_by === "masuri" && (
            <span className="text-xs text-purple-500">· Masuri viết</span>
          )}
          {page.topic && (
            <span className="text-xs font-medium" style={{ color: text }}>
              {page.topic.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <PublishButton pageId={page.id} title={page.title_vi} />
        <span
          className="text-xs font-bold"
          style={{ color: isDraft ? "#E97A95" : "#3A6B2A" }}
        >
          {isDraft ? "Duyệt →" : "Xem →"}
        </span>
      </div>
    </Link>
  );
}

// ── Empty ────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center pt-16 pb-8 text-center">
      <Pig pose="cheering" size={80} animate />
      <p
        className="text-xl font-bold text-ink mt-6 mb-2"
        style={{ fontFamily: "var(--font-handwritten)" }}
      >
        Tất cả đã được duyệt!
      </p>
      <p className="text-sm text-ink-soft mb-6 px-6">
        Không còn trang nào chờ duyệt nữa 🌸
      </p>
      <Link
        href="/masuri/notebook/card/new"
        className="bg-rose-500 text-white text-sm font-semibold px-7 py-3 rounded-2xl"
        style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
      >
        Viết thiệp từ vựng cho Heo
      </Link>
    </div>
  );
}
