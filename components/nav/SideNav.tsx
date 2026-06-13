"use client";

/**
 * SideNav — desktop replacement for BottomNav at ≥1024px (lg). Blueprint §8.1.
 * Fixed left rail, 240px wide. Same 3 items as BottomNav plus Calendar (which
 * BottomNav doesn't surface), each with the section name as a text label.
 *
 * Layouts hide BottomNav at lg and pad main content by 240px (lg:pl-60) to
 * leave room for the rail.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotebookIcon } from "@/components/notebook/NotebookIcon";

type NavIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

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
    const id = setInterval(poll, 90_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [who]);
  return count;
}

export function SideNav({ who }: { who: "heo" | "masuri" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${who}`;
  const unseenAsks = useUnseenAskCount(who);

  const links: { href: string; icon: NavIcon; label: string; matchPrefix?: boolean }[] = [
    { href: base, icon: Home as NavIcon, label: t("home") },
    { href: `${base}/notebook`, icon: NotebookIcon as NavIcon, label: t("notebook"), matchPrefix: true },
    { href: "/calendar", icon: CalendarIcon as NavIcon, label: t("calendar") ?? "Lịch", matchPrefix: true },
    { href: `${base}/settings`, icon: Settings as NavIcon, label: t("settings") },
  ];

  useEffect(() => {
    links.forEach(({ href }) => router.prefetch(href));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sectionLabel = who === "heo" ? "Heo" : "Masuri";

  return (
    <nav
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 w-60 flex-col border-r border-rose-200/50 px-5 pt-8 pb-6"
      style={{
        background: "rgba(255, 249, 245, 0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      } as React.CSSProperties}
    >
      <p
        className="text-2xl font-bold text-rose-400 mb-8 px-2"
        style={{ fontFamily: "var(--font-handwritten)" }}
      >
        {sectionLabel}
      </p>

      <ul className="flex flex-col gap-1">
        {links.map(({ href, icon: Icon, label, matchPrefix }) => {
          const active = matchPrefix ? pathname.startsWith(href) : pathname === href;
          const isNotebook = href.endsWith("/notebook");
          const showBadge = isNotebook && unseenAsks > 0;

          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                  active ? "bg-rose-100" : "hover:bg-rose-50"
                }`}
              >
                <span className="relative flex-shrink-0">
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.2 : 1.6}
                    className={`transition-colors duration-200 ${active ? "text-rose-500" : "text-rose-400"}`}
                  />
                  {showBadge && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: "#E97A95", fontSize: 9, lineHeight: 1 }}
                      aria-label={`${unseenAsks} câu trả lời mới`}
                    >
                      {unseenAsks > 9 ? "9+" : unseenAsks}
                    </span>
                  )}
                </span>
                <span
                  className={`font-accent text-base transition-colors duration-200 ${
                    active ? "text-rose-500" : "text-rose-400"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto px-2 text-[10px] text-ink-soft/60">
        Heo &amp; Masuri 💕
      </div>
    </nav>
  );
}

function CalendarIcon({ size = 22, strokeWidth = 1.6, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M3 9 L21 9" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M8 3 L8 7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M16 3 L16 7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
