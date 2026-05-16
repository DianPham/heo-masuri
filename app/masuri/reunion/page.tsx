export const revalidate = 300;

import { createServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { ReunionForm } from "@/components/countdown/ReunionForm";

export default async function ReunionPage() {
  const t = await getTranslations("reunion");
  let current: { label: string; label_en: string | null; target_date: string } | null = null;

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("reunion_dates")
      .select("label, label_en, target_date")
      .eq("is_current", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    current = data;
  } catch {
    // env vars not set
  }

  return (
    <div className="px-6 pt-10 pb-8 max-w-md mx-auto">
      <h1
        className="font-display text-3xl text-ink italic mb-1"
        style={{ fontVariationSettings: "'opsz' 48" }}
      >
        Countdown
      </h1>
      <p className="font-body text-sm text-ink-soft mb-8">
        {current ? t("edit") : t("createNew")}
      </p>
      <ReunionForm current={current} />
    </div>
  );
}
