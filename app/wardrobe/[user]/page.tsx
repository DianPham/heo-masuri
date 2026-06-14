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
    <div className="min-h-dvh px-5 pb-16 pt-10" style={{ backgroundColor: "var(--color-cream)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/wardrobe" className="back-link mb-4">
          ← Tủ đồ của bạn
        </Link>
        <h1 className="page-title mb-1.5">
          Tủ đồ của {user === "heo" ? "Heo" : "Masuri"}
        </h1>
        <p className="page-subtitle mb-6">
          Nhấn vào một món để gợi ý cho người ấy mặc.
        </p>
        <WardrobePartner partnerSlug={user as "heo" | "masuri"} initial={items} />
      </div>
    </div>
  );
}
