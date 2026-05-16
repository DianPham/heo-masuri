"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { NotebookIcon } from "@/components/notebook/NotebookIcon";

type NavIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export function BottomNav({ who }: { who: "heo" | "masuri" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${who}`;

  const links: { href: string; icon: NavIcon; label: string }[] = [
    { href: base, icon: Home as NavIcon, label: t("home") },
    { href: `${base}/notebook`, icon: NotebookIcon as NavIcon, label: t("notebook") },
    { href: `${base}/settings`, icon: Settings as NavIcon, label: t("settings") },
  ];

  // Eagerly prefetch all tab routes on mount so the first tap is instant
  useEffect(() => {
    links.forEach(({ href }) => router.prefetch(href));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          // Home: exact match. Notebook: starts-with (has sub-pages). Settings: exact.
          const active =
            href.endsWith("/notebook")
              ? pathname.startsWith(href)
              : pathname === href;
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
