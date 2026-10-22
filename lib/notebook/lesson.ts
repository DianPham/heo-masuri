/**
 * Lesson view — one language-neutral shape for the Stories renderer.
 *
 * A daily page stores the English track in `cards` (original schema, `_en`
 * fields) and the Chinese track in `cards_zh` (`_zh` + `_pinyin` fields).
 * `toLessonView(page, lang)` maps either into the same LessonCard shape so the
 * card components only branch on `lang` for copy, TTS voice, tokenizing and
 * answer checking — never on field names.
 */
import type {
  AskPromptCard,
  CaptionPolaroidData,
  Card,
  CompletionCard,
  DailyPage,
  IntroCard,
  LessonLang,
  PigSaysData,
  SentenceRemixData,
  SpotImposterData,
  TwoTruthsData,
  WordTrainData,
  ZhCaptionPolaroidData,
  ZhCard,
  ZhPigSaysData,
  ZhSentenceRemixData,
  ZhSpotImposterData,
  ZhWordTrainData,
} from "@/types/notebook";

// ── Language metadata ─────────────────────────────────────────
export const LANG_META: Record<
  LessonLang,
  { flag: string; name_vi: string; ttsLang: string; ttsRate: number }
> = {
  en: { flag: "🇬🇧", name_vi: "tiếng Anh", ttsLang: "en-US", ttsRate: 0.9 },
  // Slower for a beginner ear — tones are easier to catch.
  zh: { flag: "🇨🇳", name_vi: "tiếng Trung", ttsLang: "zh-CN", ttsRate: 0.8 },
};

export const LESSON_LANGS: LessonLang[] = ["en", "zh"];

export function parseLang(value: unknown): LessonLang | null {
  return value === "en" || value === "zh" ? value : null;
}

// ── Neutral card shapes ───────────────────────────────────────
export type LessonWordCard = {
  type: "word";
  /** Headword — English word or hanzi. */
  word: string;
  pinyin?: string;
  word_vi: string;
  /** Chinese only: Sino-Vietnamese reading — a memory hook for Heo */
  han_viet?: string;
  example: string;
  example_pinyin?: string;
  example_vi: string;
  pos?: string;
  image_emoji?: string;
};

export type LessonSentence = { text: string; pinyin?: string; vi: string };

export type LessonReadingCard = {
  type: "reading";
  title_vi?: string;
  sentences: LessonSentence[];
  vocab_highlights?: string[];
};

export type LessonWordTrain = {
  exercise_type: "word_train";
  target: string;
  target_pinyin?: string;
  shuffled_words: string[];
  hint_vi: string;
};
export type LessonSpotImposter = {
  exercise_type: "spot_imposter";
  tokens: string[];
  imposter_word: string;
  correct_word: string;
  hint_vi: string;
};
export type LessonPigSays = {
  exercise_type: "pig_says";
  prompt_vi: string;
  target: string;
  target_pinyin?: string;
  hints: { verb?: string; noun?: string };
};
export type LessonCaptionPolaroid = {
  exercise_type: "caption_polaroid";
  image_emoji: string;
  image_url?: string;
  starter_words: string[];
  example: string;
  example_pinyin?: string;
};
export type LessonSentenceRemix = {
  exercise_type: "sentence_remix";
  base: string;
  base_pinyin?: string;
  base_vi: string;
  instruction_vi: string;
  target: string;
  target_pinyin?: string;
  hint_words: string[];
};
export type LessonTwoTruths = {
  exercise_type: "two_truths";
  prompt_vi: string;
  starter_words: string[];
};
export type LessonExercise =
  | LessonWordTrain
  | LessonSpotImposter
  | LessonPigSays
  | LessonCaptionPolaroid
  | LessonSentenceRemix
  | LessonTwoTruths;

export type LessonExerciseCard = {
  type: "exercise";
  can_skip: boolean;
  exercise: LessonExercise;
};

export type LessonCard =
  | IntroCard
  | LessonWordCard
  | LessonReadingCard
  | LessonExerciseCard
  | AskPromptCard
  | CompletionCard;

export type GlossaryEntry = { vi: string; pinyin?: string };

export interface LessonView {
  lang: LessonLang;
  cards: LessonCard[];
  /** Headword → meaning, from the word cards. English keys are lowercased. */
  glossary: Record<string, GlossaryEntry>;
}

// ── Page helpers ──────────────────────────────────────────────
/** daily_pages row (select "*") → DailyPage. */
export function pageFromRow(row: Record<string, unknown>): DailyPage {
  return {
    id: row.id as string,
    title_vi: row.title_vi as string,
    title_en: row.title_en as string,
    topic: row.topic as string,
    difficulty: row.difficulty as DailyPage["difficulty"],
    cards: row.cards as DailyPage["cards"],
    scheduled_for: row.scheduled_for as string,
    completed_at: (row.completed_at as string | null) ?? null,
    title_zh: row.title_zh as string | null | undefined,
    cards_zh: row.cards_zh as DailyPage["cards_zh"],
    completed_en_at: row.completed_en_at as string | null | undefined,
    completed_zh_at: row.completed_zh_at as string | null | undefined,
  };
}

export function hasZhTrack(page: Pick<DailyPage, "cards_zh">): boolean {
  return Array.isArray(page.cards_zh) && page.cards_zh.length > 0;
}

export function availableLangs(page: Pick<DailyPage, "cards_zh">): LessonLang[] {
  return hasZhTrack(page) ? ["en", "zh"] : ["en"];
}

/** When the given language's track was completed (null if not yet). */
export function langCompletedAt(
  page: Pick<DailyPage, "completed_at" | "completed_en_at" | "completed_zh_at">,
  lang: LessonLang
): string | null {
  if (lang === "zh") return page.completed_zh_at ?? null;
  // Rows read without the per-language columns predate the Chinese track,
  // so any completion is an English one.
  if (page.completed_en_at !== undefined) return page.completed_en_at;
  return page.completed_at;
}

// ── Mapping ───────────────────────────────────────────────────
const arr = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);

function fromEnCard(card: Card): LessonCard {
  switch (card.type) {
    case "word":
      return {
        type: "word",
        word: card.word_en,
        word_vi: card.word_vi,
        example: card.example_en,
        example_vi: card.example_vi,
        pos: card.pos,
        image_emoji: card.image_emoji,
      };
    case "reading":
      return {
        type: "reading",
        title_vi: card.title_vi,
        sentences: arr(card.sentences_en).map((text, i) => ({
          text,
          vi: arr(card.sentences_vi)[i] ?? "",
        })),
        vocab_highlights: card.vocab_highlights,
      };
    case "exercise":
      return { type: "exercise", can_skip: card.can_skip, exercise: fromEnExercise(card.exercise_type, card.data) };
    default:
      return card;
  }
}

function fromEnExercise(type: string, data: unknown): LessonExercise {
  switch (type) {
    case "word_train": {
      const d = data as WordTrainData;
      return { exercise_type: "word_train", target: d.target_sentence_en, shuffled_words: arr(d.shuffled_words), hint_vi: d.hint_vi };
    }
    case "spot_imposter": {
      const d = data as SpotImposterData;
      return {
        exercise_type: "spot_imposter",
        tokens: (d.sentence_en ?? "").split(/\s+/).filter(Boolean),
        imposter_word: d.imposter_word,
        correct_word: d.correct_word,
        hint_vi: d.hint_vi,
      };
    }
    case "pig_says": {
      const d = data as PigSaysData;
      return { exercise_type: "pig_says", prompt_vi: d.prompt_vi, target: d.target_en, hints: d.hints ?? {} };
    }
    case "caption_polaroid": {
      const d = data as CaptionPolaroidData;
      return {
        exercise_type: "caption_polaroid",
        image_emoji: d.image_emoji,
        image_url: d.image_url,
        starter_words: arr(d.starter_words),
        example: d.example_en,
      };
    }
    case "sentence_remix": {
      const d = data as SentenceRemixData;
      return {
        exercise_type: "sentence_remix",
        base: d.base_en,
        base_vi: d.base_vi,
        instruction_vi: d.instruction_vi,
        target: d.target_en,
        hint_words: arr(d.hint_words),
      };
    }
    default: {
      const d = data as TwoTruthsData;
      return { exercise_type: "two_truths", prompt_vi: d.prompt_vi, starter_words: arr(d.starter_words) };
    }
  }
}

function fromZhCard(card: ZhCard): LessonCard {
  switch (card.type) {
    case "word":
      return {
        type: "word",
        word: card.word_zh,
        pinyin: card.pinyin,
        word_vi: card.word_vi,
        han_viet: card.han_viet,
        example: card.example_zh,
        example_pinyin: card.example_pinyin,
        example_vi: card.example_vi,
        pos: card.pos,
        image_emoji: card.image_emoji,
      };
    case "reading":
      return {
        type: "reading",
        title_vi: card.title_vi,
        sentences: arr(card.sentences_zh).map((text, i) => ({
          text,
          pinyin: arr(card.sentences_pinyin)[i],
          vi: arr(card.sentences_vi)[i] ?? "",
        })),
        vocab_highlights: card.vocab_highlights,
      };
    case "exercise":
      return { type: "exercise", can_skip: card.can_skip, exercise: fromZhExercise(card.exercise_type, card.data) };
    default:
      return card;
  }
}

function fromZhExercise(type: string, data: unknown): LessonExercise {
  switch (type) {
    case "word_train": {
      const d = data as ZhWordTrainData;
      return {
        exercise_type: "word_train",
        target: d.target_sentence_zh,
        target_pinyin: d.target_sentence_pinyin,
        shuffled_words: arr(d.shuffled_words),
        hint_vi: d.hint_vi,
      };
    }
    case "spot_imposter": {
      const d = data as ZhSpotImposterData;
      return {
        exercise_type: "spot_imposter",
        tokens: arr(d.sentence_tokens),
        imposter_word: d.imposter_word,
        correct_word: d.correct_word,
        hint_vi: d.hint_vi,
      };
    }
    case "pig_says": {
      const d = data as ZhPigSaysData;
      return {
        exercise_type: "pig_says",
        prompt_vi: d.prompt_vi,
        target: d.target_zh,
        target_pinyin: d.target_pinyin,
        hints: d.hints ?? {},
      };
    }
    case "caption_polaroid": {
      const d = data as ZhCaptionPolaroidData;
      return {
        exercise_type: "caption_polaroid",
        image_emoji: d.image_emoji,
        image_url: d.image_url,
        starter_words: arr(d.starter_words),
        example: d.example_zh,
        example_pinyin: d.example_pinyin,
      };
    }
    case "sentence_remix": {
      const d = data as ZhSentenceRemixData;
      return {
        exercise_type: "sentence_remix",
        base: d.base_zh,
        base_pinyin: d.base_pinyin,
        base_vi: d.base_vi,
        instruction_vi: d.instruction_vi,
        target: d.target_zh,
        target_pinyin: d.target_pinyin,
        hint_words: arr(d.hint_words),
      };
    }
    default: {
      const d = data as TwoTruthsData;
      return { exercise_type: "two_truths", prompt_vi: d.prompt_vi, starter_words: arr(d.starter_words) };
    }
  }
}

/**
 * Build the view for one language track. Returns null when the page has no
 * track in that language (Chinese not generated yet).
 */
export function toLessonView(page: DailyPage, lang: LessonLang): LessonView | null {
  const cards: LessonCard[] =
    lang === "zh"
      ? hasZhTrack(page)
        ? (page.cards_zh as ZhCard[]).map(fromZhCard)
        : []
      : arr(page.cards).map(fromEnCard);
  if (cards.length === 0) return null;

  const glossary: Record<string, GlossaryEntry> = {};
  for (const c of cards) {
    if (c.type === "word" && c.word) {
      glossary[glossaryKey(c.word, lang)] = { vi: c.word_vi, pinyin: c.pinyin };
    }
  }
  return { lang, cards, glossary };
}

// ── Text helpers ──────────────────────────────────────────────
// CJK + ASCII punctuation and whitespace — ignored when comparing Chinese.
const ZH_IGNORABLE = /[\s\p{P}\p{S}]/gu;

export function glossaryKey(word: string, lang: LessonLang): string {
  return lang === "zh" ? word.replace(ZH_IGNORABLE, "") : word.toLowerCase();
}

function normalizeEn(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

function normalizeZh(s: string): string {
  return s.replace(ZH_IGNORABLE, "");
}

/** Pinyin without tone marks/numbers, spaces or punctuation: "Nǐ hǎo!" → "nihao". ü/v → u. */
export function normalizePinyin(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/v/g, "u")
    .replace(/[^a-z]/g, "");
}

/**
 * Lenient answer check. English: case/punctuation-insensitive. Chinese: the
 * answer may be typed in hanzi OR in pinyin (tones optional) — Heo may not
 * have a Chinese keyboard installed.
 */
export function answerMatches(
  answer: string,
  target: string,
  lang: LessonLang,
  targetPinyin?: string
): boolean {
  if (lang === "en") return normalizeEn(answer) === normalizeEn(target);
  const zh = normalizeZh(answer);
  if (zh && zh === normalizeZh(target)) return true;
  if (!targetPinyin) return false;
  const py = normalizePinyin(answer);
  return py.length > 0 && py === normalizePinyin(targetPinyin);
}

/** Compare a tapped token with an expected word (spot-the-imposter). */
export function sameToken(a: string, b: string, lang: LessonLang): boolean {
  if (lang === "zh") return normalizeZh(a) === normalizeZh(b);
  return a.replace(/[^a-zA-Z]/g, "").toLowerCase() === b.replace(/[^a-zA-Z]/g, "").toLowerCase();
}

/** Join chips into a sentence: spaces between English words, none in Chinese. */
export function joinTokens(tokens: string[], lang: LessonLang): string {
  return tokens.join(lang === "zh" ? "" : " ");
}

/** Append a starter/hint chip to free text in the right style for the language. */
export function appendChip(prev: string, chip: string, lang: LessonLang): string {
  if (lang === "zh") return prev + chip;
  const trimmed = prev.trimEnd();
  return trimmed ? `${trimmed} ${chip}` : chip;
}

export type TextToken = { text: string; tappable: boolean };

/**
 * Split a sentence into tappable tokens.
 * English: whitespace-separated words. Chinese: greedy longest match against
 * the lesson glossary (so 咖啡 stays one word), single hanzi otherwise;
 * punctuation is not tappable.
 */
export function tokenize(text: string, lang: LessonLang, glossary: Record<string, GlossaryEntry> = {}): TextToken[] {
  if (lang === "en") {
    return text.split(/(\s+)/).filter(Boolean).map((t) => ({ text: t, tappable: !/^\s+$/.test(t) }));
  }
  const words = Object.keys(glossary).filter(Boolean);
  const maxLen = words.reduce((m, w) => Math.max(m, w.length), 1);
  const chars = Array.from(text);
  const out: TextToken[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (/[\s\p{P}\p{S}]/u.test(ch)) {
      out.push({ text: ch, tappable: false });
      i++;
      continue;
    }
    // Latin runs inside Chinese ("和Masuri说话") stay whole and aren't tappable
    if (/[A-Za-z0-9]/.test(ch)) {
      let j = i;
      while (j < chars.length && /[A-Za-z0-9]/.test(chars[j])) j++;
      out.push({ text: chars.slice(i, j).join(""), tappable: false });
      i = j;
      continue;
    }
    let match = ch;
    for (let len = Math.min(maxLen, chars.length - i); len > 1; len--) {
      const candidate = chars.slice(i, i + len).join("");
      if (glossary[candidate]) {
        match = candidate;
        break;
      }
    }
    out.push({ text: match, tappable: true });
    i += Array.from(match).length;
  }
  return out;
}
