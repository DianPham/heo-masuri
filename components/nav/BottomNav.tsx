"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Settings, Calendar, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { NotebookIcon } from "@/components/notebook/NotebookIcon";

type NavIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;

/** G3: poll for unseen ask replies and show a badge dot on the notebook icon. */
function useUnseenAskCount(who: "heo" | "masuri") {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (who !== "heo") return;

    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch("/api/notebook/ask/unseen", { cache: "no-store" });
        if (!cancelled && r.ok) {
          const d = await r.json();
          setCount(d.count ?? 0);
        }
      } catch { /* ignore */ }
    }

    poll();
    // Re-check every 90 seconds while the app is open
    const id = setInterval(poll, 90_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [who]);

  return count;
}

export function BottomNav({ who }: { who: "heo" | "masuri" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${who}`;
  const unseenAsks = useUnseenAskCount(who);

  const links: { href: string; icon: NavIcon; label: string; matchPrefix?: boolean }[] = [
    { href: base, icon: Home as NavIcon, label: t("home") },
    { href: "/calendar", icon: Calendar as NavIcon, label: t("calendar"), matchPrefix: true },
    { href: `${base}/notebook`, icon: NotebookIcon as NavIcon, label: t("notebook"), matchPrefix: true },
    { href: "/dates", icon: Heart as NavIcon, label: t("dates"), matchPrefix: true },
    { href: `${base}/settings`, icon: Settings as NavIcon, label: t("settings") },
  ];

  // Eagerly prefetch all tab routes on mount so the first tap is instant
  useEffect(() => {
    links.forEach(({ href }) => router.prefetch(href));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:left-1/2 md:right-auto md:bottom-6 md:-translate-x-1/2 md:rounded-full"
      style={{
        background: "rgba(255, 249, 245, 0.86)",
        backdropFilter: "saturate(140%) blur(20px)",
        WebkitBackdropFilter: "saturate(140%) blur(20px)",
        borderTop: "1px solid var(--color-hairline)",
        boxShadow: "var(--shadow-md)",
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] max-w-md mx-auto md:max-w-fit md:gap-1 md:px-2 md:py-2 md:pb-2">
        {links.map(({ href, icon: Icon, label, matchPrefix }) => {
          const active = matchPrefix ? pathname.startsWith(href) : pathname === href;
          const isNotebook = href.endsWith("/notebook");
          const showBadge = isNotebook && unseenAsks > 0;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="relative flex flex-col items-center gap-0.5 py-2 px-3 md:px-4 rounded-full outline-none active:scale-95 transition-transform"
            >
              {active && (
                <motion.div
                  layoutId={`nav-pill-${who}`}
                  className="absolute inset-0 rounded-full"
                  style={{ background: "var(--color-accent-tint)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.1 : 1.7}
                  className="transition-colors duration-200"
                  style={{ color: active ? "var(--color-accent)" : "var(--color-ink-mute)" }}
                />
                {showBadge && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ background: "var(--color-accent)", fontSize: 9, lineHeight: 1 }}
                    aria-label={`${unseenAsks} câu trả lời mới`}
                  >
                    {unseenAsks > 9 ? "9+" : unseenAsks}
                  </span>
                )}
              </span>
              <span
                className="relative z-10 text-[10px] font-medium tracking-tight transition-colors duration-200"
                style={{ color: active ? "var(--color-accent)" : "var(--color-ink-mute)" }}
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
