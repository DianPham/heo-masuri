/**
 * /api/wardrobe/items/[id]
 *
 * PATCH  → update label / tags / archived (owner only)
 * DELETE → hard-delete row + remove the storage objects (owner only)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import { signWardrobeItems, type WardrobeItemRow } from "@/lib/wardrobe";
import { notifyPartner } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("wardrobe_items").select("owner").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.owner !== viewerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const update: Record<string, unknown> = {};
  if (body.label !== undefined) update.label = body.label === null ? null : String(body.label).trim().slice(0, 80);
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) return NextResponse.json({ error: "tags must be array" }, { status: 400 });
    update.tags = body.tags
      .filter((t: unknown): t is string => typeof t === "string")
      .map((t: string) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (body.archived !== undefined) update.archived = body.archived === true;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("wardrobe_items")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    console.error("[wardrobe items PATCH]", error);
    return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 500 });
  }
  const [item] = await signWardrobeItems(supabase, [data as WardrobeItemRow]);

  const itemLabel = (data.label as string | null) || "một món đồ";
  const archived = update.archived === true;
  await notifyPartner({
    actorId: viewerId,
    prefKey: "outfit_enabled",
    build: (name) => {
      const ownerSlug = name === "Heo" ? "heo" : "masuri";
      return archived
        ? {
            push: { title: `${name} cất một món đồ đi`, body: itemLabel, url: `/wardrobe/${ownerSlug}`, tag: "wardrobe" },
            activity: { icon: "🧺", message: `${name} cất đồ: ${itemLabel}`, url: `/wardrobe/${ownerSlug}` },
          }
        : {
            push: { title: `${name} chỉnh tủ đồ 👗`, body: itemLabel, url: `/wardrobe/${ownerSlug}`, tag: "wardrobe" },
            activity: { icon: "👗", message: `${name} chỉnh đồ: ${itemLabel}`, url: `/wardrobe/${ownerSlug}` },
          };
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("wardrobe_items")
    .select("owner, photo_url, thumbnail_url, label")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.owner !== viewerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Storage cleanup (best-effort — ignore errors).
  const paths = [existing.photo_url, existing.thumbnail_url].filter((p): p is string => !!p);
  if (paths.length) {
    await supabase.storage.from("wardrobe").remove(paths).catch(() => undefined);
  }
  const { error } = await supabase.from("wardrobe_items").delete().eq("id", id);
  if (error) {
    console.error("[wardrobe items DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const itemLabel = (existing.label as string | null) || "một món đồ";
  await notifyPartner({
    actorId: viewerId,
    prefKey: "outfit_enabled",
    build: (name) => ({
      push: { title: `${name} xoá một món khỏi tủ`, body: itemLabel, url: "/wardrobe", tag: "wardrobe" },
      activity: { icon: "🗑️", message: `${name} xoá đồ: ${itemLabel}`, url: "/wardrobe" },
    }),
  });

  return NextResponse.json({ ok: true });
}
