/**
 * /api/wardrobe/items
 *
 * GET  ?owner=<slug>&archived=0|1 → list items for the given owner (default
 *      = viewer). Returns each item with fresh 24h signed URLs.
 * POST → create a new wardrobe_items row. Body: { photo_path, thumbnail_path?,
 *      label?, tags? }. Photo + thumbnail must already be uploaded via the
 *      mint-signed-url endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import { signWardrobeItems, type WardrobeItemRow } from "@/lib/wardrobe";
import { notifyPartner } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const ownerSlug = req.nextUrl.searchParams.get("owner");
  const archived = req.nextUrl.searchParams.get("archived") === "1";

  let ownerId = viewerId;
  if (ownerSlug === "heo" || ownerSlug === "masuri") {
    const { data: u } = await supabase
      .from("users").select("id").eq("slug", ownerSlug).single();
    if (u) ownerId = u.id;
  }

  const { data, error } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("owner", ownerId)
    .eq("archived", archived)
    .order("added_at", { ascending: false });
  if (error) {
    console.error("[wardrobe items GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const items = await signWardrobeItems(supabase, (data ?? []) as WardrobeItemRow[]);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const photo_path = typeof body.photo_path === "string" ? body.photo_path : null;
  const thumb_path = typeof body.thumbnail_path === "string" ? body.thumbnail_path : null;
  if (!photo_path) {
    return NextResponse.json({ error: "photo_path required" }, { status: 400 });
  }
  // Hard-anchor the path under the viewer's UUID — prevents shenanigans.
  if (!photo_path.startsWith(`${viewerId}/`)) {
    return NextResponse.json({ error: "photo_path must be under viewer" }, { status: 403 });
  }
  if (thumb_path && !thumb_path.startsWith(`${viewerId}/`)) {
    return NextResponse.json({ error: "thumbnail_path must be under viewer" }, { status: 403 });
  }

  const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) || null : null;
  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((t: unknown): t is string => typeof t === "string")
        .map((t: string) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("wardrobe_items")
    .insert({
      owner: viewerId,
      photo_url: photo_path,
      thumbnail_url: thumb_path,
      label,
      tags,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[wardrobe items POST]", error);
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }
  const [item] = await signWardrobeItems(supabase, [data as WardrobeItemRow]);

  const itemLabel = label || "một món đồ mới";
  await notifyPartner({
    actorId: viewerId,
    prefKey: "outfit_enabled",
    build: (name) => ({
      push: {
        title: `${name} thêm đồ vào tủ 👗`,
        body: `Vào chọn "${itemLabel}" cho người ấy mặc nha`,
        url: `/wardrobe/${name === "Heo" ? "heo" : "masuri"}`,
        tag: "wardrobe",
      },
      activity: {
        icon: "👗",
        message: `${name} thêm vào tủ đồ: ${itemLabel}`,
        url: `/wardrobe/${name === "Heo" ? "heo" : "masuri"}`,
      },
    }),
  });

  return NextResponse.json({ item });
}
