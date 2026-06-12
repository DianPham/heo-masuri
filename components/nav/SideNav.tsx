"use client";

/**
 * SideNav — left-rail navigation for desktop (lg+) on routes where the
 * floating BottomNav would otherwise overlap the content (e.g. /calendar).
 *
 * Mirrors the BottomNav links 1:1 so behaviour stays consistent across
 * breakpoints. Renders nothing under lg via the `hidden lg:flex` classes
 * passed by the parent layout.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Home, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotebookIcon } from "@/components/notebook/NotebookIcon";

type NavIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export function SideNav({ who }: { who: "heo" | "masuri" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${who}`;

  const links: { href: string; icon: NavIcon; label: string }[] = [
    { href: base, icon: Home as NavIcon, label: t("home") },
    { href: `${base}/notebook`, icon: NotebookIcon as NavIcon, label: t("notebook") },
    { href: "/calendar", icon: CalendarIcon, label: t("calendar") ?? "Lịch" },
    { href: `${base}/settings`, icon: Settings as NavIcon, label: t("settings") },
  ];

  useEffect(() => {
    links.forEach(({ href }) => router.prefetch(href));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-6 z-30 border-r border-rose-200/40"
      style={{
        background: "rgba(255, 249, 245, 0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "none",
      } as React.CSSProperties}
      data-side-nav
    >
      <style>{`@media (min-width: 1024px) { [data-side-nav] { display: flex !important; } }`}</style>
      <nav className="flex flex-col items-stretch gap-2 w-full px-2">
        {links.map(({ href, icon: Icon, label }) => {
          const active =
            href.endsWith("/notebook") || href === "/calendar"
              ? pathname.startsWith(href)
              : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl transition-colors hover:bg-rose-100/60"
              style={{
                backgroundColor: active ? "rgba(255, 201, 213, 0.45)" : "transparent",
              }}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.6}
                className={`transition-colors duration-200 ${active ? "text-rose-500" : "text-rose-400"}`}
              />
              <span
                className={`text-[10px] font-medium ${active ? "text-rose-500" : "text-rose-400"}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
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
