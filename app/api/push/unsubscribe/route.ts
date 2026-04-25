import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { endpoint } = await req.json().catch(() => ({}));
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const supabase = createServerClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
