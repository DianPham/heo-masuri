import { createServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Pig } from "@/components/theme/Pig";
import { cookies } from "next/headers";

const VALID_REPLIES = ["sorry", "on_my_way", "talk_in_10", "heard_you"] as const;
type Reply = (typeof VALID_REPLIES)[number];

export default async function AngryReplyPage({
  params,
}: {
  params: Promise<{ id: string; reply: string }>;
}) {
  const { id, reply } = await params;

  // Guard: only masuri can reply
  const cookieStore = await cookies();
  const who = cookieStore.get("who")?.value;
  if (who !== "masuri") redirect("/");

  if (!VALID_REPLIES.includes(reply as Reply)) return notFound();

  const [t, tAngry] = await Promise.all([
    getTranslations("reply"),
    getTranslations("angry"),
  ]);

  const supabase = createServerClient();
  const { data } = await supabase
    .from("angry_buzzes")
    .select("id, dan_reply")
    .eq("id", id)
    .single();

  if (!data) return notFound();

  if (!data.dan_reply) {
    await supabase
      .from("angry_buzzes")
      .update({ dan_reply: reply, dan_replied_at: new Date().toISOString() })
      .eq("id", id);

    await supabase.channel("couple").send({
      type: "broadcast",
      event: "angry:reply",
      payload: { id, reply },
    });
  }

  const replyKey = reply as Reply;
  const label = tAngry(`replies.${replyKey}`);

  return (
    <main className="min-h-dvh bg-cream flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Pig pose="heart-eyes" size={96} />
      <div className="space-y-2">
        <h1 className="font-display text-2xl text-ink italic">{t("title")}</h1>
        <p className="font-body text-ink-soft text-sm">{t("body")}</p>
        <p className="font-body text-ink font-semibold">{label}</p>
      </div>
      <Link href="/masuri" className="font-body text-sm text-rose-500 underline underline-offset-4">
        {t("goHome")}
      </Link>
    </main>
  );
}
