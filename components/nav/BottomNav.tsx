"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

export function BottomNav({ who }: { who: "heo" | "masuri" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const base = `/${who}`;

  const links = [
    { href: base, icon: Home, label: t("home") },
    { href: `${base}/settings`, icon: Settings, label: t("settings") },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-rose-50/90 backdrop-blur-sm
                 border-t border-rose-200 flex items-center justify-around
                 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      {links.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={[
              "flex flex-col items-center gap-1 py-2 px-8 rounded-2xl transition-colors duration-150",
              active
                ? "text-rose-500 bg-rose-100"
                : "text-rose-300 hover:text-rose-400",
            ].join(" ")}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span className="text-[10px] font-body font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
