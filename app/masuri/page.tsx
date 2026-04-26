import { getLocale } from "next-intl/server";
import { Pig } from "@/components/theme/Pig";
import { ThinkingButtons } from "@/components/buttons/ThinkingButtons";

export default async function MasuriHome() {
  const locale = await getLocale();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-96px)] px-8 gap-8">
      <Pig pose="sparkle" size={120} />

      <div className="space-y-1 text-center">
        <h1
          className="font-display text-4xl text-ink italic"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          Chào Masuri 💕
        </h1>
        <p className="font-body text-ink-soft text-sm">
          {locale === "vi" ? "Gửi yêu thương đến Heo nào" : "Send your love to Heo"}
        </p>
      </div>

      <ThinkingButtons who="masuri" locale={locale} />
    </div>
  );
}
