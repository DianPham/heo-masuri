import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
