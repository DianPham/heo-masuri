import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value as "heo" | "masuri" | undefined;
  if (!who) return NextResponse.json({ pings: [] }, { status: 403 });

  const supabase = createServerClient();
  const { data: me } = await supabase.from("users").select("id").eq("slug", who).single();
  if (!me) return NextResponse.json({ pings: [] });

  const { data: pings } = await supabase
    .from("thinking_pings")
    .select("id, kind, from_user, created_at")
    .eq("to_user", me.id)
    .is("seen_at", null)
    .order("created_at", { ascending: true })
    .limit(10);

  if (!pings || pings.length === 0) return NextResponse.json({ pings: [] });

  // Resolve sender slugs/names in one query
  const senderIds = [...new Set(pings.map(p => p.from_user))];
  const { data: senders } = await supabase
    .from("users")
    .select("id, slug, display_name")
    .in("id", senderIds);

  const senderMap = Object.fromEntries(
    (senders ?? []).map(s => [s.id, { slug: s.slug, display_name: s.display_name }])
  );

  const result = pings.map(p => ({
    id: p.id,
    kind: p.kind as "thinking" | "hug" | "kiss",
    from: senderMap[p.from_user]?.slug ?? "masuri",
    from_name: senderMap[p.from_user]?.display_name ?? "Masuri",
  }));

  return NextResponse.json({ pings: result });
}
