import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Buzzes carry need_type + context_note — must be signed in as one of the
  // couple to read. Previously any UUID returned the full buzz.
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json(null, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("angry_buzzes")
    .select("id, need_type, context_note, dan_reply, dan_replied_at, resolved_at, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(data);
}
