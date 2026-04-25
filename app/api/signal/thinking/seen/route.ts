import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createServerClient();
  await supabase
    .from("thinking_pings")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", id)
    .is("seen_at", null);

  return NextResponse.json({ ok: true });
}
