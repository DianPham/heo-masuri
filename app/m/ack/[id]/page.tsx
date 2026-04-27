import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Pig } from "@/components/theme/Pig";

export default async function AckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("ack");
  const supabase = createServerClient();

  const { data } = await supabase
    .from("missing_signals")
    .select("id, acknowledged_at")
    .eq("id", id)
    .single();

  if (!data) return notFound();

  if (!data.acknowledged_at) {
    await supabase
      .from("missing_signals")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", id);

    // Broadcast realtime ack so Heo's open session knows
    await supabase.channel("couple").send({
      type: "broadcast",
      event: "missing:ack",
      payload: { id },
    });
  }

  return (
    <main className="min-h-dvh bg-cream flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Pig pose="heart-eyes" size={96} />
      <div className="space-y-2">
        <h1 className="font-display text-2xl text-ink italic">{t("title")}</h1>
        <p className="font-body text-ink-soft text-sm">{t("body")}</p>
      </div>
      <Link href="/masuri" className="font-body text-sm text-rose-500 underline underline-offset-4">
        {t("goHome")}
      </Link>
    </main>
  );
}
