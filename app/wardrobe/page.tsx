/**
 * /wardrobe — viewer's OWN wardrobe + pending suggestions inbox.
 * Blueprint §7.3.
 */
import { headers, cookies } from "next/headers";
import Link from "next/link";
import { WardrobeOwn } from "@/components/wardrobe/WardrobeOwn";
import { PendingSuggestions } from "@/components/wardrobe/PendingSuggestions";
import type { VisibleWardrobeItem, OutfitSuggestion } from "@/components/wardrobe/types";

export const dynamic = "force-dynamic";

async function relay<T>(path: string, fallback: T): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  try {
    const res = await fetch(`${base}${path}`, { headers: { cookie: cookieHeader }, cache: "no-store" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export default async function WardrobePage() {
  const cookieStore = await cookies();
  const who = (cookieStore.get("who")?.value ?? "") as "heo" | "masuri" | "";
  const partner = who === "heo" ? "masuri" : "heo";

  const [{ items }, { suggestions }] = await Promise.all([
    relay<{ items: VisibleWardrobeItem[] }>("/api/wardrobe/items", { items: [] }),
    relay<{ suggestions: OutfitSuggestion[] }>("/api/wardrobe/suggestions?status=pending", { suggestions: [] }),
  ]);

  // Pending suggestions show items that belong to the VIEWER — they're being
  // suggested for the viewer to wear. So hydrate from the viewer's own list.
  // (We still fetch partner items elsewhere when needed, but not here.)
  const itemMap: Record<string, VisibleWardrobeItem> = {};
  for (const it of items) itemMap[it.id] = it;
  const suggestionsWithItems = suggestions.map((s) => ({ ...s, item: itemMap[s.wardrobe_item] }));

  return (
    <div className="min-h-dvh px-5 pb-16 pt-10" style={{ backgroundColor: "var(--color-cream)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/dates" className="back-link mb-4">
          ← Hẹn hò
        </Link>
        <h1 className="page-title mb-1.5">Tủ đồ</h1>
        <p className="page-subtitle mb-2">Đồ của bạn — nhấn vào để chỉnh sửa.</p>
        <Link
          href={`/wardrobe/${partner}`}
          className="inline-flex items-center gap-1 text-[12.5px] mb-6 transition-colors"
          style={{ color: "var(--color-accent)" }}
        >
          Xem tủ đồ của người ấy →
        </Link>

        <PendingSuggestions initial={suggestionsWithItems} />
        <WardrobeOwn initial={items} />
      </div>
    </div>
  );
}
