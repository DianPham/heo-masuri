export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { AngryForm } from "@/components/angry/AngryForm";

export default async function AngryPage() {
  const supabase = createServerClient();
  const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();

  if (heo) {
    const { data: activeBuzz } = await supabase
      .from("angry_buzzes")
      .select("id")
      .eq("from_user", heo.id)
      .is("resolved_at", null)
      .maybeSingle();

    if (activeBuzz) redirect(`/heo/angry/${activeBuzz.id}`);
  }

  return <AngryForm />;
}
