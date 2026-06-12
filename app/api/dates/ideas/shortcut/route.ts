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
      title: preview.title,
      description: preview.description,
      thumbnail_url: preview.image,
      notes,
      tags: [],
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[dates/ideas/shortcut POST]", error);
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
