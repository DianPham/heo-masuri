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
import { Home, Settings, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotebookIcon } from "@/components/notebook/NotebookIcon";

type NavIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;

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
    { href: "/calendar", icon: CalendarIcon as NavIcon, label: t("calendar") ?? "Lịch", matchPrefix: true },
    { href: `${base}/notebook`, icon: NotebookIcon as NavIcon, label: t("notebook"), matchPrefix: true },
    { href: "/dates", icon: Heart as NavIcon, label: t("dates"), matchPrefix: true },
    { href: `${base}/settings`, icon: Settings as NavIcon, label: t("settings") },
  ];

  useEffect(() => {
    links.forEach(({ href }) => router.prefetch(href));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sectionLabel = who === "heo" ? "Heo" : "Masuri";

  return (
    <nav
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 w-60 flex-col px-4 pt-9 pb-6"
      style={{
        background: "rgba(255, 249, 245, 0.92)",
        backdropFilter: "saturate(140%) blur(20px)",
        WebkitBackdropFilter: "saturate(140%) blur(20px)",
        borderRight: "1px solid var(--color-hairline)",
      } as React.CSSProperties}
    >
      <p
        className="mb-10 px-3 text-[20px] font-medium tracking-tight"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
      >
        {sectionLabel}
      </p>

      <ul className="flex flex-col gap-0.5">
        {links.map(({ href, icon: Icon, label, matchPrefix }) => {
          const active = matchPrefix ? pathname.startsWith(href) : pathname === href;
          const isNotebook = href.endsWith("/notebook");
          const showBadge = isNotebook && unseenAsks > 0;

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                style={{
                  background: active ? "var(--color-accent-tint)" : "transparent",
                }}
              >
                <span className="relative flex-shrink-0">
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
                  className="text-sm font-medium tracking-tight transition-colors duration-200"
                  style={{ color: active ? "var(--color-accent)" : "var(--color-ink)" }}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div
        className="mt-auto px-3 text-[10px] tracking-wide uppercase"
        style={{ color: "var(--color-ink-mute)", letterSpacing: "0.1em" }}
      >
        Heo &amp; Masuri
      </div>
    </nav>
  );
}

function CalendarIcon({ size = 22, strokeWidth = 1.6, className, style }: { size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M3 9 L21 9" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M8 3 L8 7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M16 3 L16 7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
