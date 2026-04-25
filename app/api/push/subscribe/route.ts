import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (!who) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { subscription, userAgent } = await req.json().catch(() => ({}));
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: user } = await supabase.from("users").select("id").eq("slug", who).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent ?? null,
      },
      { onConflict: "endpoint" }
    );

  if (error) return NextResponse.json({ error: "DB error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
