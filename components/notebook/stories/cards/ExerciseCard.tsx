"use client";

/**
 * ExerciseCard — routes to the appropriate exercise component.
 * Pointer events are stopped at this level so none leak to StoriesRenderer.
 * Blueprint §8 / CP5.
 */
import { InfoTip } from "@/components/notebook/InfoTip";
import type { ExerciseCard as ExerciseCardType } from "@/types/notebook";
import type {
  WordTrainData,
  SpotImposterData,
  PigSaysData,
  CaptionPolaroidData,
  SentenceRemixData,
  TwoTruthsData,
} from "@/types/notebook";
import { WordTrain } from "./exercises/WordTrain";
import { SpotImposter } from "./exercises/SpotImposter";
import { PigSays } from "./exercises/PigSays";
import { CaptionPolaroid } from "./exercises/CaptionPolaroid";
import { SentenceRemix } from "./exercises/SentenceRemix";
import { TwoTruths } from "./exercises/TwoTruths";

const EXERCISE_LABELS: Record<string, string> = {
  word_train:       "Xếp câu đúng thứ tự",
  spot_imposter:    "Tìm từ sai",
  pig_says:         "Pig nói gì?",
  caption_polaroid: "Viết chú thích ảnh",
  sentence_remix:   "Remix câu",
  two_truths:       "Hai sự thật, một lời bịa",
};

interface ExerciseCardProps {
  card: ExerciseCardType;
  onSkip: () => void;
  onTooHard: () => void;
}

export function ExerciseCard({ card, onSkip, onTooHard }: ExerciseCardProps) {
  const label = EXERCISE_LABELS[card.exercise_type] ?? card.exercise_type;

  function renderExercise() {
    switch (card.exercise_type) {
      case "word_train":
        return <WordTrain data={card.data as WordTrainData} onContinue={onSkip} />;
      case "spot_imposter":
        return <SpotImposter data={card.data as SpotImposterData} onContinue={onSkip} />;
      case "pig_says":
        return <PigSays data={card.data as PigSaysData} onContinue={onSkip} />;
      case "caption_polaroid":
        return <CaptionPolaroid data={card.data as CaptionPolaroidData} onContinue={onSkip} />;
      case "sentence_remix":
        return <SentenceRemix data={card.data as SentenceRemixData} onContinue={onSkip} />;
      case "two_truths":
        return <TwoTruths data={card.data as TwoTruthsData} onContinue={onSkip} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col h-full px-7 py-8">
      {/* Header — no nested opacity animation; parent card handles entrance */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-0.5">
          Luyện tập
        </p>
        <h2
          className="text-xl font-bold text-ink"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {label}
        </h2>
      </div>

      {/* Exercise body */}
      <div className="flex-1 flex flex-col min-h-0">
        {renderExercise()}
      </div>

      {/* Skip / Too hard */}
      <div className="flex items-center justify-between pt-3 mt-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onTooHard}
            className="text-xs text-rose-300 font-medium py-2 px-3 rounded-xl active:bg-rose-50"
          >
            Khó quá 😣
          </button>
          <InfoTip
            text="Nhấn khi bài khó quá — Masuri sẽ được báo và có thể hỗ trợ Heo. Heo vẫn tiếp tục bài bình thường, không mất điểm."
            position="top"
          />
        </div>
        {card.can_skip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-rose-300 font-medium py-2 px-3 rounded-xl active:bg-rose-50"
          >
            Bỏ qua
          </button>
        )}
      </div>
    </div>
  );
}
