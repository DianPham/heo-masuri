/**
 * /api/gmgn/config
 *
 * Manages the GM and GN recurring_letters rows for the Masuri→Heo pair.
 *
 * GET  → { gm: RecurringLetter | null, gn: RecurringLetter | null }
 * PUT  → upsert (one or both of: gm, gn)
 *
 * Body for PUT:
 *   {
 *     gm?: { enabled, send_at_local: "HH:MM", pool: string[] },
 *     gn?: { enabled, send_at_local: "HH:MM", pool: string[] }
 *   }
 *
 * Either or both keys can be present. Each upserts on the unique
 * (from_user, to_user, kind) index — first call creates the row, subsequent
 * calls update it.
 *
 * Auth: cookie `who=masuri`.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createTypedServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

type ConfigInput = {
  enabled?: boolean;
  send_at_local?: string;
  pool?: string[];
};

async function requireMasuri() {
  const cookieStore = await cookies();
  return cookieStore.get("who")?.value === "masuri";
}

async function loadPair() {
  const supabase = createTypedServerClient();
  const [{ data: masuri }, { data: heo }] = await Promise.all([
    supabase.from("users").select("id").eq("slug", "masuri").single(),
    supabase.from("users").select("id").eq("slug", "heo").single(),
  ]);
  return { supabase, masuriId: masuri?.id, heoId: heo?.id };
}

export async function GET() {
  if (!(await requireMasuri())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { supabase, masuriId, heoId } = await loadPair();
  if (!masuriId || !heoId) {
    return NextResponse.json({ error: "Users not found" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("recurring_letters")
    .select("id, kind, pool, send_at_local, enabled, timezone, last_delivered_at, last_pool_index")
    .eq("from_user", masuriId)
    .eq("to_user", heoId)
    .in("kind", ["gm", "gn"]);

  if (error) {
    console.error("[gmgn/config GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const gm = data?.find((r) => r.kind === "gm") ?? null;
  const gn = data?.find((r) => r.kind === "gn") ?? null;
  return NextResponse.json({ gm, gn });
}

function validateConfig(input: unknown, kind: "gm" | "gn"): ConfigInput | { error: string } {
  if (!input || typeof input !== "object") {
    return { error: `${kind}: not an object` };
  }
  const c = input as Record<string, unknown>;
  const out: ConfigInput = {};

  if (c.enabled !== undefined) {
    if (typeof c.enabled !== "boolean") return { error: `${kind}.enabled must be boolean` };
    out.enabled = c.enabled;
  }
  if (c.send_at_local !== undefined) {
    if (typeof c.send_at_local !== "string" || !HHMM.test(c.send_at_local)) {
      return { error: `${kind}.send_at_local must be "HH:MM"` };
    }
    out.send_at_local = c.send_at_local;
  }
  if (c.pool !== undefined) {
    if (!Array.isArray(c.pool) || c.pool.some((s) => typeof s !== "string" || !s.trim())) {
      return { error: `${kind}.pool must be a non-empty array of non-empty strings` };
    }
    if (c.pool.length === 0) {
      return { error: `${kind}.pool cannot be empty` };
    }
    out.pool = c.pool as string[];
  }

  return out;
}

export async function PUT(req: NextRequest) {
  if (!(await requireMasuri())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Array<{ kind: "gm" | "gn"; config: ConfigInput }> = [];

  for (const k of ["gm", "gn"] as const) {
    if (body[k] !== undefined) {
      const v = validateConfig(body[k], k);
      if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
      updates.push({ kind: k, config: v });
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Provide at least one of gm/gn" }, { status: 400 });
  }

  const { supabase, masuriId, heoId } = await loadPair();
  if (!masuriId || !heoId) {
    return NextResponse.json({ error: "Users not found" }, { status: 500 });
  }

  for (const { kind, config } of updates) {
    // Defaults for first-time creation
    const defaults = {
      send_at_local: kind === "gm" ? "07:00:00" : "22:00:00",
      pool: kind === "gm"
        ? ["Chào buổi sáng Heo 🌸"]
        : ["Chúc Heo ngủ ngon nha 🌙"],
      enabled: true,
    };

    // Normalize send_at_local to HH:MM:SS for the DB time column
    const send_at_local = config.send_at_local
      ? config.send_at_local + ":00"
      : defaults.send_at_local;

    const { error } = await supabase
      .from("recurring_letters")
      .upsert(
        {
          from_user: masuriId,
          to_user: heoId,
          kind,
          enabled: config.enabled ?? defaults.enabled,
          send_at_local,
          pool: config.pool ?? defaults.pool,
          timezone: "Asia/Ho_Chi_Minh",
        },
        { onConflict: "from_user,to_user,kind" }
      );

    if (error) {
      console.error("[gmgn/config PUT]", kind, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, updated: updates.map((u) => u.kind) });
}
