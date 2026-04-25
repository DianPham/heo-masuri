import Link from "next/link";
import { Home, Settings } from "lucide-react";

export default function MasuriLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-rose-50 flex flex-col">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-rose-50/90 backdrop-blur-sm
                   border-t border-rose-200 flex items-center justify-around
                   px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <Link
          href="/masuri"
          className="flex flex-col items-center gap-1 text-rose-400 hover:text-rose-500 transition-colors"
        >
          <Home size={22} />
          <span className="text-[10px] font-body font-medium">Trang chủ</span>
        </Link>
        <Link
          href="/masuri/settings"
          className="flex flex-col items-center gap-1 text-rose-400 hover:text-rose-500 transition-colors"
        >
          <Settings size={22} />
          <span className="text-[10px] font-body font-medium">Cài đặt</span>
        </Link>
      </nav>
    </div>
  );
}
