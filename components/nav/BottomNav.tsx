"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";

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
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-rose-200/50"
      style={{
        background: "rgba(255, 249, 245, 0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-around px-8 pt-3 pb-[calc(0.625rem+env(safe-area-inset-bottom))] max-w-md mx-auto">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-1.5 py-2 px-8 rounded-2xl outline-none"
            >
              {active && (
                <motion.div
                  layoutId={`nav-pill-${who}`}
                  className="absolute inset-0 rounded-2xl bg-rose-100"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.6}
                  className={`transition-colors duration-200 ${active ? "text-rose-500" : "text-rose-300"}`}
                />
              </span>
              <span
                className={`relative z-10 text-sm font-accent transition-colors duration-200 ${
                  active ? "text-rose-500" : "text-rose-300"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
