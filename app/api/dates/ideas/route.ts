/**
 * /api/dates/ideas
 *
 * GET  ?archived=0|1&slot_type=... → list ideas (default archived=0)
 * POST → create a new idea.
 *        Body: { url?, title?, description?, notes?, tags?, slot_type?, thumbnail_url? }
 *
 * Blueprint §7.1.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import { notifyPartner } from "@/lib/notify";

export const dynamic = "force-dynamic";

function ideaLabel(idea: { title?: string | null; notes?: string | null; url?: string | null }): string {
  return (idea.title || idea.notes || idea.url || "ý tưởng mới").toString().slice(0, 60);
}

const SLOT_TYPES = ["eat","drink","activity","walk","movie","drive","home","other"] as const;

function cleanStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

function cleanTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

export async function GET(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const archived = req.nextUrl.searchParams.get("archived") === "1";
  const slot = req.nextUrl.searchParams.get("slot_type");

  const supabase = createServerClient();
  let q = supabase
    .from("date_ideas")
    .select("*")
    .eq("archived", archived)
    .order("created_at", { ascending: false });
  if (slot && SLOT_TYPES.includes(slot as typeof SLOT_TYPES[number])) {
    q = q.eq("slot_type", slot);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[dates/ideas GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ideas: data ?? [] });
}

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = cleanStr(body.url, 2000);
  const title = cleanStr(body.title, 200);
  const description = cleanStr(body.description, 1000);
  const notes = cleanStr(body.notes, 500);
  const tags = cleanTags(body.tags);
  const thumbnail_url = cleanStr(body.thumbnail_url, 2000);
  const slot_type = SLOT_TYPES.includes(body.slot_type) ? body.slot_type : null;

  if (!url && !title && !notes) {
    return NextResponse.json({ error: "need at least url, title, or notes" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("date_ideas")
    .insert({
      added_by: viewerId,
      url, title, description, notes, tags, slot_type, thumbnail_url,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[dates/ideas POST]", error);
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  const label = ideaLabel(data);
  await notifyPartner({
    actorId: viewerId,
    prefKey: "date_planning_enabled",
    build: (name) => ({
      push: { title: `${name} lưu một ý tưởng hẹn 💡`, body: label, url: "/dates/ideas", tag: "date-idea" },
      activity: { icon: "💡", message: `${name} lưu ý tưởng: ${label}`, url: "/dates/ideas" },
    }),
  });

  return NextResponse.json({ idea: data });
}
