/**
 * /api/surprises/pool
 *
 * GET  → list all surprise pool items (active and retired)
 * POST → add a new item
 *
 * Auth: cookie `who=masuri` — same pattern as other Masuri-only routes.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createTypedServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireMasuri() {
  const cookieStore = await cookies();
  return cookieStore.get("who")?.value === "masuri";
}

export async function GET() {
  if (!(await requireMasuri())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createTypedServerClient();

  // List pool items with their delivery count (for "last delivered" awareness).
  const { data: pool, error } = await supabase
    .from("surprise_pool")
    .select("id, body, language, weight, attachments, retired_at, created_at, author")
    .order("retired_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[surprises/pool GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add delivery counts in a single query.
  const ids = (pool ?? []).map((p) => p.id);
  let deliveryCounts: Record<string, { count: number; last_delivered_at: string | null }> = {};
  if (ids.length > 0) {
    const { data: deliveries } = await supabase
      .from("surprise_deliveries")
      .select("pool_id, delivered_at")
      .in("pool_id", ids)
      .order("delivered_at", { ascending: false });
    deliveryCounts = (deliveries ?? []).reduce((acc, d) => {
      const existing = acc[d.pool_id];
      if (!existing) {
        acc[d.pool_id] = { count: 1, last_delivered_at: d.delivered_at };
      } else {
        existing.count++;
      }
      return acc;
    }, {} as Record<string, { count: number; last_delivered_at: string | null }>);
  }

  const items = (pool ?? []).map((p) => ({
    ...p,
    delivery_count: deliveryCounts[p.id]?.count ?? 0,
    last_delivered_at: deliveryCounts[p.id]?.last_delivered_at ?? null,
  }));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!(await requireMasuri())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = (body.body as string | undefined)?.trim();
  const language = (body.language as string | undefined) ?? "vi";
  const weight = typeof body.weight === "number" ? body.weight : 1;
  const attachments = body.attachments ?? null;

  if (!text) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  if (!["vi", "en", "mixed"].includes(language)) {
    return NextResponse.json({ error: "invalid language" }, { status: 400 });
  }
  if (weight < 1 || weight > 10) {
    return NextResponse.json({ error: "weight must be 1-10" }, { status: 400 });
  }

  const supabase = createTypedServerClient();

  // author = Masuri's user id (look up by slug)
  const { data: masuri } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "masuri")
    .single();
  if (!masuri) {
    return NextResponse.json({ error: "Masuri user not found" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("surprise_pool")
    .insert({
      body: text,
      language,
      weight,
      attachments,
      author: masuri.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[surprises/pool POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
