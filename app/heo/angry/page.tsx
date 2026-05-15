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
      .select("id, created_at, dan_reply")
      .eq("from_user", heo.id)
      .is("resolved_at", null)
      .maybeSingle();

    if (activeBuzz) {
      // Don't redirect if buzz has been waiting more than 1 hour without a reply (expired)
      const isExpired = !activeBuzz.dan_reply &&
        Date.now() - new Date(activeBuzz.created_at).getTime() > 3_600_000;
      if (!isExpired) redirect(`/heo/angry/${activeBuzz.id}`);
    }
  }

  return <AngryForm />;
}
