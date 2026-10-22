/**
 * Server-side validation for generated lesson tracks.
 * Shared by POST /api/notebook/routine/draft (new lessons, both tracks) and
 * POST /api/notebook/routine/zh-backfill (Chinese track for existing lessons).
 * Catches the generator mistakes that would otherwise render as blank cards.
 */
import { normalizePinyin } from "./lesson";

const VALID_CARD_TYPES = ["intro", "word", "reading", "exercise", "ask_prompt", "completion"];
const VALID_EXERCISE_TYPES = ["word_train", "spot_imposter", "pig_says", "caption_polaroid", "sentence_remix", "two_truths"];

type Obj = Record<string, unknown>;

function checkShape(cards: unknown, label: string): { errors: string[]; cards: Obj[] } {
  const errors: string[] = [];
  if (!Array.isArray(cards) || cards.length < 4) {
    errors.push(`${label} must have at least 4 items`);
    return { errors, cards: [] };
  }
  const list = cards as Obj[];
  if (list[0]?.type !== "intro") errors.push(`${label}: first card must be intro`);
  if (list[list.length - 1]?.type !== "completion") errors.push(`${label}: last card must be completion`);
  if (list.length > 12) errors.push(`${label}: too many cards (max 12)`);
  for (const [i, card] of list.entries()) {
    if (!VALID_CARD_TYPES.includes(card.type as string))
      errors.push(`${label}[${i}] invalid type '${card.type}'`);
    if (card.type === "exercise" && !VALID_EXERCISE_TYPES.includes(card.exercise_type as string))
      errors.push(`${label}[${i}] invalid exercise_type '${card.exercise_type}'`);
  }
  return { errors, cards: list };
}

/** English track — `cards`. */
export function validateEnCards(cards: unknown): string[] {
  const { errors, cards: list } = checkShape(cards, "cards");
  for (const [i, card] of list.entries()) {
    if (card.type !== "exercise") continue;
    // Validate required data fields per exercise type — prevents silent blank renders
    const d = card.data as Obj | null | undefined;
    if (!d) { errors.push(`card[${i}] exercise missing data object`); continue; }
    switch (card.exercise_type) {
      case "word_train":
        if (!d.target_sentence_en) errors.push(`card[${i}] word_train: missing target_sentence_en`);
        if (!Array.isArray(d.shuffled_words) || (d.shuffled_words as unknown[]).length === 0)
          errors.push(`card[${i}] word_train: missing/empty shuffled_words array`);
        if (!d.hint_vi) errors.push(`card[${i}] word_train: missing hint_vi`);
        break;
      case "spot_imposter":
        if (!d.sentence_en) errors.push(`card[${i}] spot_imposter: missing sentence_en`);
        if (!d.imposter_word) errors.push(`card[${i}] spot_imposter: missing imposter_word`);
        if (!d.correct_word) errors.push(`card[${i}] spot_imposter: missing correct_word`);
        if (!d.hint_vi) errors.push(`card[${i}] spot_imposter: missing hint_vi`);
        break;
      case "pig_says":
        if (!d.prompt_vi) errors.push(`card[${i}] pig_says: missing prompt_vi`);
        if (!d.target_en) errors.push(`card[${i}] pig_says: missing target_en`);
        break;
      case "caption_polaroid":
        if (!d.image_emoji) errors.push(`card[${i}] caption_polaroid: missing image_emoji`);
        if (!Array.isArray(d.starter_words))
          errors.push(`card[${i}] caption_polaroid: missing starter_words array`);
        if (!d.example_en) errors.push(`card[${i}] caption_polaroid: missing example_en`);
        break;
      case "sentence_remix":
        if (!d.base_en) errors.push(`card[${i}] sentence_remix: missing base_en`);
        if (!d.base_vi) errors.push(`card[${i}] sentence_remix: missing base_vi`);
        if (!d.instruction_vi) errors.push(`card[${i}] sentence_remix: missing instruction_vi`);
        if (!d.target_en) errors.push(`card[${i}] sentence_remix: missing target_en`);
        if (!Array.isArray(d.hint_words)) errors.push(`card[${i}] sentence_remix: missing hint_words array`);
        break;
      case "two_truths":
        if (!d.prompt_vi) errors.push(`card[${i}] two_truths: missing prompt_vi`);
        if (!Array.isArray(d.starter_words)) errors.push(`card[${i}] two_truths: missing starter_words array`);
        break;
    }
  }
  return errors;
}

const HAN = /\p{Script=Han}/u;
const ZH_IGNORABLE = /[\s\p{P}\p{S}]/gu;
const sortedChars = (s: string) => Array.from(s.replace(ZH_IGNORABLE, "")).sort().join("");

/** Chinese track — `cards_zh`. */
export function validateZhCards(cards: unknown): string[] {
  const { errors, cards: list } = checkShape(cards, "cards_zh");
  const L = (i: number) => `cards_zh[${i}]`;
  const need = (i: number, obj: Obj, keys: string[], what: string) => {
    for (const k of keys) if (!obj[k]) errors.push(`${L(i)} ${what}: missing ${k}`);
  };
  const headwords = new Set<string>();

  for (const [i, card] of list.entries()) {
    switch (card.type) {
      case "intro":
        need(i, card, ["title_vi", "pig_pose"], "intro");
        break;
      case "word":
        need(i, card, ["word_zh", "pinyin", "word_vi", "example_zh", "example_pinyin", "example_vi"], "word");
        if (typeof card.word_zh === "string") {
          if (!HAN.test(card.word_zh)) errors.push(`${L(i)} word: word_zh must be hanzi (got '${card.word_zh}')`);
          headwords.add(card.word_zh);
        }
        if (typeof card.pinyin === "string" && HAN.test(card.pinyin))
          errors.push(`${L(i)} word: pinyin contains hanzi`);
        break;
      case "reading": {
        const zh = card.sentences_zh, py = card.sentences_pinyin, vi = card.sentences_vi;
        if (!Array.isArray(zh) || zh.length === 0) errors.push(`${L(i)} reading: missing/empty sentences_zh`);
        else {
          if (!Array.isArray(py) || py.length !== zh.length)
            errors.push(`${L(i)} reading: sentences_pinyin must match sentences_zh length`);
          if (!Array.isArray(vi) || vi.length !== zh.length)
            errors.push(`${L(i)} reading: sentences_vi must match sentences_zh length`);
        }
        break;
      }
      case "exercise": {
        const d = card.data as Obj | null | undefined;
        if (!d) { errors.push(`${L(i)} exercise missing data object`); break; }
        switch (card.exercise_type) {
          case "word_train": {
            need(i, d, ["target_sentence_zh", "target_sentence_pinyin", "hint_vi"], "word_train");
            const tokens = d.shuffled_words;
            if (!Array.isArray(tokens) || tokens.length < 2)
              errors.push(`${L(i)} word_train: shuffled_words needs at least 2 tokens`);
            else if (
              typeof d.target_sentence_zh === "string" &&
              sortedChars((tokens as string[]).join("")) !== sortedChars(d.target_sentence_zh)
            )
              errors.push(`${L(i)} word_train: shuffled_words do not rebuild target_sentence_zh`);
            break;
          }
          case "spot_imposter": {
            need(i, d, ["imposter_word", "correct_word", "hint_vi"], "spot_imposter");
            const tokens = d.sentence_tokens;
            if (!Array.isArray(tokens) || tokens.length < 2)
              errors.push(`${L(i)} spot_imposter: sentence_tokens needs at least 2 tokens`);
            else if (
              typeof d.imposter_word === "string" &&
              !(tokens as string[]).some((t) => t.replace(ZH_IGNORABLE, "") === (d.imposter_word as string).replace(ZH_IGNORABLE, ""))
            )
              errors.push(`${L(i)} spot_imposter: imposter_word is not one of sentence_tokens`);
            break;
          }
          case "pig_says":
            need(i, d, ["prompt_vi", "target_zh", "target_pinyin"], "pig_says");
            if (typeof d.target_pinyin === "string" && normalizePinyin(d.target_pinyin).length === 0)
              errors.push(`${L(i)} pig_says: target_pinyin has no latin letters`);
            break;
          case "caption_polaroid":
            need(i, d, ["image_emoji", "example_zh", "example_pinyin"], "caption_polaroid");
            if (!Array.isArray(d.starter_words)) errors.push(`${L(i)} caption_polaroid: missing starter_words array`);
            break;
          case "sentence_remix":
            need(i, d, ["base_zh", "base_pinyin", "base_vi", "instruction_vi", "target_zh", "target_pinyin"], "sentence_remix");
            if (!Array.isArray(d.hint_words)) errors.push(`${L(i)} sentence_remix: missing hint_words array`);
            break;
          case "two_truths":
            need(i, d, ["prompt_vi"], "two_truths");
            if (!Array.isArray(d.starter_words)) errors.push(`${L(i)} two_truths: missing starter_words array`);
            break;
        }
        break;
      }
      case "ask_prompt":
        need(i, card, ["suggestion_vi"], "ask_prompt");
        break;
      case "completion":
        if (!Array.isArray(card.vocab_to_save)) errors.push(`${L(i)} completion: missing vocab_to_save array`);
        else
          for (const w of card.vocab_to_save as string[])
            if (!headwords.has(w))
              errors.push(`${L(i)} completion: vocab_to_save '${w}' has no matching word card (word_zh)`);
        if (!card.sticker_kind) errors.push(`${L(i)} completion: missing sticker_kind`);
        break;
    }
  }
  return errors;
}
