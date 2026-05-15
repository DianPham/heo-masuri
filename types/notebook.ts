/**
 * Notebook type definitions — mirrors daily_pages.cards JSONB schema (blueprint §7)
 */
import type { PigPose } from "@/components/theme/Pig";
import type { StickerType } from "@/components/notebook/Sticker";

export type { PigPose, StickerType };

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

// ── Page ──────────────────────────────────────────────────────
export interface DailyPage {
  id: string;
  title_vi: string;
  title_en: string;
  topic: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  cards: Card[];
  scheduled_for: string;   // YYYY-MM-DD
  completed_at: string | null;
}
