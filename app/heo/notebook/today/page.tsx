/**
 * /heo/notebook/today — Daily Stories renderer (CP3)
 * This is a placeholder until the Stories renderer is built in CP3.
 */
import Link from "next/link";
import { Pig } from "@/components/theme/Pig";

export const dynamic = "force-dynamic";

const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

export default function TodayPage() {
  return (
    <div
      style={PAPER_BG}
      className="min-h-dvh flex flex-col items-center justify-center px-8 text-center"
    >
      <Pig pose="studying" size={96} animate />
      <p
        className="text-2xl font-bold text-ink mt-6 mb-2"
        style={{ fontFamily: "var(--font-handwritten)" }}
      >
        Trang hôm nay đang được chuẩn bị 📓
      </p>
      <p className="text-sm text-ink-soft mb-8">
        Masuri sẽ duyệt trang rồi gửi cho Heo nha 💕
      </p>
      <Link
        href="/heo/notebook"
        className="text-rose-500 text-sm font-semibold underline underline-offset-2"
      >
        Quay lại sổ
      </Link>
    </div>
  );
}
