import Link from "next/link";
import { Home, Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function MasuriLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");

  return (
    <div className="min-h-dvh bg-rose-50 flex flex-col">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom nav — fixed so it sits above iOS home indicator */}
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
          <span className="text-[10px] font-body font-medium">{t("home")}</span>
        </Link>
        <Link
          href="/masuri/settings"
          className="flex flex-col items-center gap-1 text-rose-400 hover:text-rose-500 transition-colors"
        >
          <Settings size={22} />
          <span className="text-[10px] font-body font-medium">{t("settings")}</span>
        </Link>
      </nav>
    </div>
  );
}
