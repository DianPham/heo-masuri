/**
 * POST /api/dates/ideas/shortcut?token=...
 *
 * iOS Shortcut endpoint. Authenticates with the shared secret
 * SHORTCUT_TOKEN_HEO; if it matches, inserts a row with added_by=Heo's id.
 *
 * Body: { url: string, notes?: string }
 * Returns: { ok: true, id }
 *
 * Blueprint §7.2. SECURITY: leaked token = unrestricted insert into date_ideas
 * (but no other tables and no read access). Token is per-environment.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { fetchUrlPreview } from "@/lib/url-preview";
import { aiCleanPreview } from "@/lib/ai-clean";
import { notifyPartner } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const tokenIn = req.nextUrl.searchParams.get("token");
  const expected = process.env.SHORTCUT_TOKEN_HEO;
  if (!expected) {
    return NextResponse.json({ error: "shortcut endpoint not configured" }, { status: 503 });
  }
  if (!tokenIn || tokenIn !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim().slice(0, 2000) : null;
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : null;
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  // Fetch preview opportunistically — fallback to no metadata if it fails.
  const preview = await fetchUrlPreview(url);

  // Run AI cleanup too — the Shortcut path doesn't show a form, so the AI
  // output is the only chance to land a clean title / slot guess / tags
  // before the row is saved. Silently no-ops without DEEPSEEK_API_KEY.
  const ai = await aiCleanPreview({
    url: preview.canonical_url ?? url,
    raw_title: preview.title,
    raw_description: preview.description,
  });

  const supabase = createServerClient();
  // Resolve Heo's user id.
  const { data: heo } = await supabase
    .from("users")
    .select("id")
    .eq("slug", "heo")
    .single();
  if (!heo) {
    return NextResponse.json({ error: "heo user not found" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("date_ideas")
    .insert({
      added_by: heo.id,
      url,
      title: ai?.title ?? preview.title,
      description: ai?.description ?? preview.description,
      thumbnail_url: preview.image,
      slot_type: ai?.slot_type ?? null,
      notes,
      tags: ai?.tags ?? [],
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[dates/ideas/shortcut POST]", error);
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  // Always added as Heo → notify Masuri (notifyPartner resolves the partner).
  const label = (ai?.title ?? preview.title ?? notes ?? url).toString().slice(0, 60);
  await notifyPartner({
    actorId: heo.id,
    prefKey: "date_planning_enabled",
    build: (name) => ({
      push: { title: `${name} lưu một ý tưởng hẹn 💡`, body: label, url: "/dates/ideas", tag: "date-idea" },
      activity: { icon: "💡", message: `${name} lưu ý tưởng: ${label}`, url: "/dates/ideas" },
    }),
  });

  return NextResponse.json({ ok: true, id: data.id });
}
