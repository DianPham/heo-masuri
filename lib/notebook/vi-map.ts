import type { DailyPage } from "@/types/notebook";

/** Quick lookup map of all EN words → VI translations from word cards. */
export function buildViMap(page: DailyPage): Record<string, string> {
  const map: Record<string, string> = {};
  for (const card of page.cards) {
    if (card.type === "word") {
      map[card.word_en.toLowerCase()] = card.word_vi;
    }
  }
  return map;
}
