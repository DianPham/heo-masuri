import Link from "next/link";
import { Pig } from "@/components/theme/Pig";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-cream flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Pig pose="sleepy" size={96} animate={false} />
      <div className="space-y-2">
        <h1 className="font-display text-2xl text-ink italic">
          Trang này không tồn tại 🐷
        </h1>
        <p className="font-body text-ink-soft text-sm">
          Heo không tìm thấy trang bạn đang tìm...
        </p>
      </div>
      <Link
        href="/"
        className="font-body text-sm text-rose-500 underline underline-offset-4"
      >
        Về trang chủ
      </Link>
    </main>
  );
}
