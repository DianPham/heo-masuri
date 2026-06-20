/**
 * /api/wardrobe/suggestions
 *
 * GET ?role=target|suggester&status=pending|... → list suggestions involving
 *     the viewer (default: viewer as target, status=pending).
 * POST → create a suggestion. Body: { wardrobe_item, target_user (id or slug),
 *        note?, date_id? }. Pushes the target via outfit_enabled pref.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import { notifyPartner } from "@/lib/notify";

export const dynamic = "force-dynamic";

const STATUSES = ["pending","accepted","counter","declined"] as const;

async function resolveUserId(supabase: ReturnType<typeof createServerClient>, val: string): Promise<string | null> {
  if (/^[0-9a-f-]{36}$/i.test(val)) return val;
  if (val === "heo" || val === "masuri") {
    const { data } = await supabase.from("users").select("id").eq("slug", val).single();
    return data?.id ?? null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = req.nextUrl.searchParams.get("role") === "suggester" ? "suggester" : "target_user";
  const status = req.nextUrl.searchParams.get("status");
  const supabase = createServerClient();
  let q = supabase
    .from("outfit_suggestions")
    .select("*")
    .eq(role, viewerId)
    .order("created_at", { ascending: false });
  if (status && (STATUSES as readonly string[]).includes(status)) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) {
    console.error("[suggestions GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ suggestions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const wardrobeItem = typeof body.wardrobe_item === "string" ? body.wardrobe_item : null;
  const targetIn = typeof body.target_user === "string" ? body.target_user : null;
  if (!wardrobeItem) return NextResponse.json({ error: "wardrobe_item required" }, { status: 400 });
  if (!targetIn) return NextResponse.json({ error: "target_user required" }, { status: 400 });

  const supabase = createServerClient();
  const targetId = await resolveUserId(supabase, targetIn);
  if (!targetId) return NextResponse.json({ error: "invalid target_user" }, { status: 400 });
  if (targetId === viewerId) return NextResponse.json({ error: "cannot suggest to yourself" }, { status: 400 });

  // Verify the wardrobe item exists and belongs to the target (you suggest
  // FROM the other person's wardrobe). Blueprint §7.3.
  const { data: item } = await supabase
    .from("wardrobe_items")
    .select("id, owner, label")
    .eq("id", wardrobeItem)
    .maybeSingle();
  if (!item || item.owner !== targetId) {
    return NextResponse.json({ error: "item must belong to target_user" }, { status: 400 });
  }

  const dateId = typeof body.date_id === "string" ? body.date_id : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;

  const { data, error } = await supabase
    .from("outfit_suggestions")
    .insert({
      date_id: dateId,
      suggester: viewerId,
      target_user: targetId,
      wardrobe_item: wardrobeItem,
      note,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[suggestions POST]", error);
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  // Notify the target (= partner, since there are only two users).
  await notifyPartner({
    actorId: viewerId,
    prefKey: "outfit_enabled",
    build: (name) => ({
      push: {
        title: `${name} chọn đồ cho bạn 👗💕`,
        body: item.label ? `Gợi ý mặc "${item.label}" nha` : "Mở tủ đồ xem nha",
        url: "/wardrobe",
        tag: "outfit-suggestion",
      },
      activity: {
        icon: "👗",
        message: item.label ? `${name} gợi ý bạn mặc: ${item.label}` : `${name} gợi ý đồ cho bạn`,
        url: "/wardrobe",
      },
    }),
  });

  return NextResponse.json({ suggestion: data });
}
