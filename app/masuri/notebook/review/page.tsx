/**
 * /masuri/notebook/review — Full list of pending draft/approved pages.
 * Blueprint CP7 §5: Masuri sees all queued pages, can tap to approve/edit.
 */
import Link from "next/link";
import { Pig } from "@/components/theme/Pig";
import { Tape } from "@/components/notebook/Tape";
import { InfoTip } from "@/components/notebook/InfoTip";
import { ReviewRow } from "@/components/notebook/ReviewRow";
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
                  <ReviewRow key={p.id} page={p} />
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
                  <ReviewRow key={p.id} page={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
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
