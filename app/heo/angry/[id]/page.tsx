import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ActiveBuzz } from "@/components/angry/ActiveBuzz";

const NEED_LABELS: Record<string, string> = {
  space:    "Heo cần không gian",
  presence: "Heo cần Masuri ở đây",
  vent:     "Heo chỉ muốn xả",
  fix:      "Heo cần Masuri sửa cái gì đó",
};

export default async function ActiveBuzzPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createServerClient();
  const { data: buzz } = await supabase
    .from("angry_buzzes")
    .select("id, need_type, dan_reply, resolved_at, from_user")
    .eq("id", id)
    .single();

  if (!buzz) return notFound();

  // Verify this buzz belongs to Heo
  const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
  if (!heo || buzz.from_user !== heo.id) return notFound();

  // Already resolved → go home
  if (buzz.resolved_at) redirect("/heo");

  return (
    <ActiveBuzz
      id={buzz.id}
      needType={buzz.need_type as "space" | "presence" | "vent" | "fix"}
      needLabel={NEED_LABELS[buzz.need_type] ?? buzz.need_type}
      initialReply={buzz.dan_reply}
    />
  );
}
