/**
 * Notebook type definitions — mirrors daily_pages.cards JSONB schema (blueprint §7)
 * and the Chinese track in daily_pages.cards_zh (migration 021).
 */
import type { PigPose } from "@/components/theme/Pig";
import type { StickerType } from "@/components/notebook/Sticker";

export type { PigPose, StickerType };

/** Language a lesson is studied in. Every page has `en`; `zh` once cards_zh is filled. */
export type LessonLang = "en" | "zh";

// ── Exercise types ────────────────────────────────────────────
export type ExerciseType =
  | "word_train"
  | "spot_imposter"
  | "pig_says"
  | "caption_polaroid"
  | "sentence_remix"
  | "two_truths";

// Exercise data shapes (refined per card type, used in exercises CP5)
export type WordTrainData = {
  target_sentence_en: string;
  shuffled_words: string[];
  hint_vi: string;
};
export type SpotImposterData = {
  sentence_en: string;
  imposter_word: string;
  correct_word: string;
  hint_vi: string;
};
export type PigSaysData = {
  prompt_vi: string;
  target_en: string;
  hints: { verb?: string; noun?: string };
};
export type CaptionPolaroidData = {
  image_emoji: string;
  /** Optional real image URL attached by the Routine. Takes priority over image_emoji. */
  image_url?: string;
  starter_words: string[];
  example_en: string;
};
export type SentenceRemixData = {
  base_en: string;
  base_vi: string;
  instruction_vi: string;
  target_en: string;
  hint_words: string[];
};
export type TwoTruthsData = {
  prompt_vi: string;
  starter_words: string[];
};
export type ExerciseData =
  | WordTrainData
  | SpotImposterData
  | PigSaysData
  | CaptionPolaroidData
  | SentenceRemixData
  | TwoTruthsData;

// ── Card types ────────────────────────────────────────────────
export type IntroCard = {
  type: "intro";
  title_vi: string;
  subtitle_vi?: string;
  pig_pose: PigPose;
};

export type WordCard = {
  type: "word";
  word_en: string;
  word_vi: string;
  example_en: string;
  example_vi: string;
  pos?: string;
  image_emoji?: string;
};

export type ReadingCard = {
  type: "reading";
  title_vi?: string;
  sentences_en: string[];
  sentences_vi: string[];
  vocab_highlights?: string[];
};

export type ExerciseCard = {
  type: "exercise";
  exercise_type: ExerciseType;
  data: ExerciseData;
  can_skip: boolean;
};

export type AskPromptCard = {
  type: "ask_prompt";
  suggestion_vi: string;
};

export type CompletionCard = {
  type: "completion";
  vocab_to_save: string[];
  sticker_kind: StickerType;
};

export type Card =
  | IntroCard
  | WordCard
  | ReadingCard
  | ExerciseCard
  | AskPromptCard
  | CompletionCard;

// ── Chinese track (daily_pages.cards_zh) ──────────────────────
// Same card sequence as the English track, with hanzi + pinyin in place of
// English. Vietnamese copy (intro, hints, instructions) is unchanged.
// Pinyin uses tone marks ("nǐ hǎo"). Chinese has no spaces, so anything the
// UI splits into chips is given as an explicit token array.
export type ZhWordTrainData = {
  target_sentence_zh: string;
  target_sentence_pinyin: string;
  /** Tokens of target_sentence_zh, shuffled. Joined in order they rebuild the sentence. */
  shuffled_words: string[];
  hint_vi: string;
};
export type ZhSpotImposterData = {
  /** The sentence split into words, imposter included, in sentence order. */
  sentence_tokens: string[];
  imposter_word: string;
  correct_word: string;
  hint_vi: string;
};
export type ZhPigSaysData = {
  prompt_vi: string;
  target_zh: string;
  target_pinyin: string;
  hints: { verb?: string; noun?: string };
};
export type ZhCaptionPolaroidData = {
  image_emoji: string;
  image_url?: string;
  starter_words: string[];
  example_zh: string;
  example_pinyin: string;
};
export type ZhSentenceRemixData = {
  base_zh: string;
  base_pinyin: string;
  base_vi: string;
  instruction_vi: string;
  target_zh: string;
  target_pinyin: string;
  hint_words: string[];
};
export type ZhExerciseData =
  | ZhWordTrainData
  | ZhSpotImposterData
  | ZhPigSaysData
  | ZhCaptionPolaroidData
  | ZhSentenceRemixData
  | TwoTruthsData;

export type ZhWordCard = {
  type: "word";
  word_zh: string;
  pinyin: string;
  word_vi: string;
  /** Sino-Vietnamese reading (âm Hán Việt), e.g. 学习 → "học tập". Omit when it doesn't help. */
  han_viet?: string;
  example_zh: string;
  example_pinyin: string;
  example_vi: string;
  pos?: string;
  image_emoji?: string;
};

export type ZhReadingCard = {
  type: "reading";
  title_vi?: string;
  sentences_zh: string[];
  sentences_pinyin: string[];
  sentences_vi: string[];
  vocab_highlights?: string[];
};

export type ZhExerciseCard = {
  type: "exercise";
  exercise_type: ExerciseType;
  data: ZhExerciseData;
  can_skip: boolean;
};

export type ZhCard =
  | IntroCard
  | ZhWordCard
  | ZhReadingCard
  | ZhExerciseCard
  | AskPromptCard
  | CompletionCard;

// ── Vocabulary ────────────────────────────────────────────────
export type SourceKind = "page" | "masuri_card" | "ask_masuri" | "letter";
export type SelfConfidence = -1 | 0 | 1;

export interface VocabWord {
  id: string;
  /** Headword in `lang`: an English word, or hanzi for Chinese. */
  word_en: string;
  word_vi: string;
  lang: LessonLang;
  pinyin?: string | null;
  example_en?: string;
  example_vi?: string;
  pos?: string;
  source_page_id?: string;
  source_kind: SourceKind;
  saved_at: string;          // ISO timestamp
  last_reviewed_at?: string;
  review_count: number;
  self_confidence: SelfConfidence;
  // Joined from daily_pages (optional, when source_kind === "page")
  source_page_title_vi?: string;
  source_page_topic?: string;
}

// ── Page ──────────────────────────────────────────────────────
export interface DailyPage {
  id: string;
  title_vi: string;
  title_en: string;
  topic: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  cards: Card[];
  scheduled_for: string;   // YYYY-MM-DD
  /** First completion in any language. */
  completed_at: string | null;
  title_zh?: string | null;
  /** Chinese track; null until generated/backfilled. */
  cards_zh?: ZhCard[] | null;
  completed_en_at?: string | null;
  completed_zh_at?: string | null;
}
