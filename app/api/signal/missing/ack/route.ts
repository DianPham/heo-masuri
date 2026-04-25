import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (who !== "masuri") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from("missing_signals")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .is("acknowledged_at", null);

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });

  await supabase.channel("couple").send({
    type: "broadcast",
    event: "missing:ack",
    payload: { id },
  });

  return NextResponse.json({ ok: true });
}
