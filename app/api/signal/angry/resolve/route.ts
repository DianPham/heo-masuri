import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("who")?.value !== "heo") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from("angry_buzzes")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id)
    .is("resolved_at", null);

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  await supabase.channel("couple").send({
    type: "broadcast",
    event: "angry:resolved",
    payload: { id },
  });

  return NextResponse.json({ ok: true });
}
