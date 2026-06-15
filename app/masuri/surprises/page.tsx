/**
 * /masuri/surprises — admin screen for managing the surprise pool.
 * Blueprint §5.4. Masuri-only (middleware gates this route).
 *
 * Layout: simple maintenance UI — add form at top, list below with
 * inline edit / retire / un-retire actions per row.
 */
import { headers, cookies } from "next/headers";
import { createTypedServerClient } from "@/lib/supabase/server";
import { SurprisePoolAdmin } from "@/components/surprises/SurprisePoolAdmin";

export const dynamic = "force-dynamic";

type PoolItem = {
  id: string;
  body: string;
  language: string;
  weight: number;
  attachments: unknown;
  retired_at: string | null;
  created_at: string | null;
  delivery_count: number;
  last_delivered_at: string | null;
};

async function fetchPool(): Promise<PoolItem[]> {
  // Server-side call to our own API to reuse the GET handler's join logic.
  // We pass through the who cookie so the auth gate matches.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  try {
    const res = await fetch(`${base}/api/surprises/pool`, {
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

async function fetchActivePoolStats() {
  const supabase = createTypedServerClient();
  const { count: active } = await supabase
    .from("surprise_pool")
    .select("id", { count: "exact", head: true })
    .is("retired_at", null);
  const { count: retired } = await supabase
    .from("surprise_pool")
    .select("id", { count: "exact", head: true })
    .not("retired_at", "is", null);
  return { active: active ?? 0, retired: retired ?? 0 };
}

export default async function MasuriSurprisesPage() {
  const [items, stats] = await Promise.all([fetchPool(), fetchActivePoolStats()]);

  return (
    <div className="min-h-dvh px-5 pb-10 pt-8" style={{ backgroundColor: "#FFF9F5" }}>
      <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink leading-tight" style={{ fontFamily: "var(--font-handwritten)" }}>
          Surprise pool 🎁
        </h1>
        <p className="text-xs text-ink-soft mt-1">
          {stats.active} active · {stats.retired} retired
        </p>
        {stats.active < 5 && (
          <p
            className="text-xs mt-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: "rgba(255,201,213,0.3)", color: "#C4667A" }}
          >
            ⚠️ Less than 5 active items — add more so the shuffle bag has variety.
          </p>
        )}
      </header>

      <SurprisePoolAdmin initialItems={items} />
      </div>
    </div>
  );
}
