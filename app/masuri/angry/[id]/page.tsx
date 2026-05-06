export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { MasuriAngryView } from "@/components/angry/MasuriAngryView";

export default async function MasuriAngryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  if (cookieStore.get("who")?.value !== "masuri") redirect("/");

  const { id } = await params;
  const supabase = createServerClient();

  const { data: buzz } = await supabase
    .from("angry_buzzes")
    .select("id, need_type, context_note, dan_reply, resolved_at, from_user")
    .eq("id", id)
    .single();

  if (!buzz) return notFound();

  // Verify this buzz belongs to Heo
  const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
  if (!heo || buzz.from_user !== heo.id) return notFound();

  // Already resolved → go home
  if (buzz.resolved_at) redirect("/masuri");

  return (
    <MasuriAngryView
      id={buzz.id}
      needType={buzz.need_type as "space" | "presence" | "vent" | "fix"}
      contextNote={buzz.context_note}
      initialReply={buzz.dan_reply}
    />
  );
}
