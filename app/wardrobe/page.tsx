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
    <div className="min-h-dvh px-5 pb-10 pt-8" style={{ backgroundColor: "#FFF9F5" }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-ink mb-1" style={{ fontFamily: "var(--font-handwritten)" }}>
          Tủ đồ
        </h1>
        <p className="text-xs text-ink-soft mb-2">Trang phục của bạn — nhấn để chỉnh.</p>
        <Link href={`/wardrobe/${partner}`} className="inline-block text-xs text-rose-400 underline underline-offset-2 mb-4">
          Xem tủ đồ của người ấy ↗
        </Link>

        <PendingSuggestions initial={suggestionsWithItems} />
        <WardrobeOwn initial={items} />
      </div>
    </div>
  );
}
