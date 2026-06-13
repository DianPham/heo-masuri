/**
 * /masuri/gmgn — admin screen for configuring GM / GN auto-notes.
 * Blueprint §5.5. Masuri-only (middleware gates).
 */
import { headers, cookies } from "next/headers";
import { GmGnAdmin, type GmGnConfig } from "@/components/surprises/GmGnAdmin";

export const dynamic = "force-dynamic";

type ConfigResponse = {
  gm: GmGnConfig | null;
  gn: GmGnConfig | null;
};

async function fetchConfig(): Promise<ConfigResponse> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  try {
    const res = await fetch(`${base}/api/gmgn/config`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return { gm: null, gn: null };
    return await res.json();
  } catch {
    return { gm: null, gn: null };
  }
}

export default async function MasuriGmGnPage() {
  const { gm, gn } = await fetchConfig();

  return (
    <div className="min-h-dvh px-5 pb-10 pt-8" style={{ backgroundColor: "#FFF9F5" }}>
      <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink leading-tight" style={{ fontFamily: "var(--font-handwritten)" }}>
          Good morning / Good night 🌸
        </h1>
        <p className="text-xs text-ink-soft mt-1">
          Daily auto-notes to Heo. Each pool rotates through one entry per day.
        </p>
      </header>

      <div className="space-y-6">
        <GmGnAdmin kind="gm" initial={gm} />
        <GmGnAdmin kind="gn" initial={gn} />
      </div>
      </div>
    </div>
  );
}
