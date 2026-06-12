/**
 * /wardrobe/[user] — the OTHER user's wardrobe. Tap an item → suggest sheet.
 * Blueprint §7.3.
 *
 * The [user] param is "heo" or "masuri". Self-view at this URL bounces to
 * /wardrobe.
 */
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WardrobePartner } from "@/components/wardrobe/WardrobePartner";
import type { VisibleWardrobeItem } from "@/components/wardrobe/types";

export const dynamic = "force-dynamic";

async function fetchItems(owner: "heo" | "masuri"): Promise<VisibleWardrobeItem[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  try {
    const res = await fetch(`${base}/api/wardrobe/items?owner=${owner}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function PartnerWardrobePage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;
  if (user !== "heo" && user !== "masuri") redirect("/wardrobe");

  const cookieStore = await cookies();
  const who = (cookieStore.get("who")?.value ?? "") as "heo" | "masuri" | "";
  if (who === user) redirect("/wardrobe");

  const items = await fetchItems(user);

  return (
    <div className="min-h-dvh px-5 pb-10 pt-8" style={{ backgroundColor: "#FFF9F5" }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-ink mb-1" style={{ fontFamily: "var(--font-handwritten)" }}>
          Tủ đồ của {user === "heo" ? "Heo" : "Masuri"}
        </h1>
        <Link href="/wardrobe" className="inline-block text-xs text-rose-400 underline underline-offset-2 mb-4">
          ← Về tủ đồ của bạn
        </Link>
        <WardrobePartner partnerSlug={user as "heo" | "masuri"} initial={items} />
      </div>
    </div>
  );
}
