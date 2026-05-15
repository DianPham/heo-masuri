/**
 * Hard-coded Day 1 test page for CP3 review.
 * Blueprint §17 — Day 1: "Chào buổi sáng" / "Good morning" / topic: greeting / difficulty: 1
 * This is used as fallback when no published page exists in the DB.
 */
import type { DailyPage } from "@/types/notebook";

export const TEST_PAGE: DailyPage = {
  id: "test-day-1-chao-buoi-sang",
  title_vi: "Chào buổi sáng",
  title_en: "Good morning",
  topic: "greeting",
  difficulty: 1,
  scheduled_for: "2026-05-15",
  completed_at: null,
  cards: [
    // ── 1. Intro ────────────────────────────────────────────
    {
      type: "intro",
      title_vi: "Trang đầu tiên 🌸",
      subtitle_vi: "Mình bắt đầu nhẹ nhàng nha. 5 phút thôi.",
      pig_pose: "studying",
    },

    // ── 2–5. Word cards ──────────────────────────────────────
    {
      type: "word",
      word_en: "morning",
      word_vi: "buổi sáng",
      example_en: "Good morning, Phương.",
      example_vi: "Chào buổi sáng, Phương.",
      pos: "noun",
      image_emoji: "🌅",
    },
    {
      type: "word",
      word_en: "hello",
      word_vi: "xin chào",
      example_en: "Hello! How are you?",
      example_vi: "Xin chào! Bạn có khỏe không?",
      pos: "interjection",
      image_emoji: "👋",
    },
    {
      type: "word",
      word_en: "today",
      word_vi: "hôm nay",
      example_en: "Today is a beautiful day.",
      example_vi: "Hôm nay là một ngày đẹp.",
      pos: "adverb",
      image_emoji: "☀️",
    },
    {
      type: "word",
      word_en: "feel",
      word_vi: "cảm thấy",
      example_en: "I feel happy today.",
      example_vi: "Hôm nay Heo cảm thấy vui.",
      pos: "verb",
      image_emoji: "🌸",
    },

    // ── 6. Reading ───────────────────────────────────────────
    {
      type: "reading",
      title_vi: "Đọc thử nha 📖",
      sentences_en: [
        "Good morning!",
        "Today is a beautiful day.",
        "I feel happy.",
        "Hello, how are you?",
      ],
      sentences_vi: [
        "Chào buổi sáng!",
        "Hôm nay là một ngày đẹp.",
        "Heo cảm thấy vui.",
        "Xin chào, bạn có khỏe không?",
      ],
      vocab_highlights: ["morning", "today", "feel", "happy", "hello"],
    },

    // ── 7. Exercise (word_train) ─────────────────────────────
    {
      type: "exercise",
      exercise_type: "word_train",
      can_skip: true,
      data: {
        target_sentence_en: "I feel happy today",
        shuffled_words: ["today", "I", "happy", "feel"],
        hint_vi: "Hôm nay Heo cảm thấy vui",
      },
    },

    // ── 8. spot_imposter ────────────────────────────────────────
    {
      type: "exercise",
      exercise_type: "spot_imposter",
      can_skip: true,
      data: {
        sentence_en: "I feel happy this morning",
        imposter_word: "this",
        correct_word: "today",
        hint_vi: "Dùng từ chỉ thời gian đúng nhất ở đây là gì?",
      },
    },

    // ── 9. pig_says ─────────────────────────────────────────────
    {
      type: "exercise",
      exercise_type: "pig_says",
      can_skip: true,
      data: {
        prompt_vi: "Xin chào! Hôm nay tôi cảm thấy vui.",
        target_en: "Hello! Today I feel happy.",
        hints: { verb: "feel", noun: "today" },
      },
    },

    // ── 10. caption_polaroid ─────────────────────────────────────
    {
      type: "exercise",
      exercise_type: "caption_polaroid",
      can_skip: true,
      data: {
        image_emoji: "🌅",
        starter_words: ["beautiful", "morning", "feel", "happy"],
        example_en: "What a beautiful morning!",
      },
    },

    // ── 11. sentence_remix ───────────────────────────────────────
    {
      type: "exercise",
      exercise_type: "sentence_remix",
      can_skip: true,
      data: {
        base_en: "I feel happy today.",
        base_vi: "Hôm nay Heo cảm thấy vui.",
        instruction_vi: "Đổi thành câu hỏi: 'Do you feel happy today?'",
        target_en: "Do you feel happy today?",
        hint_words: ["Do", "you", "feel"],
      },
    },

    // ── 12. two_truths ───────────────────────────────────────────
    {
      type: "exercise",
      exercise_type: "two_truths",
      can_skip: true,
      data: {
        prompt_vi: "Viết 2 điều thật và 1 điều bịa về buổi sáng của Heo (bằng tiếng Anh nha):",
        starter_words: ["I", "feel", "morning", "today", "happy", "hello"],
      },
    },

    // ── 13. Ask prompt ───────────────────────────────────────────
    {
      type: "ask_prompt",
      suggestion_vi: "Có từ nào khó hiểu không? Hỏi Masuri nha 💕",
    },

    // ── 14. Completion ───────────────────────────────────────
    {
      type: "completion",
      vocab_to_save: ["morning", "hello", "today", "feel"],
      sticker_kind: "flower_rose",
    },
  ],
};

/** Quick lookup map of all EN words → VI translations from word cards */
export function buildViMap(page: DailyPage): Record<string, string> {
  const map: Record<string, string> = {};
  for (const card of page.cards) {
    if (card.type === "word") {
      map[card.word_en.toLowerCase()] = card.word_vi;
    }
  }
  return map;
}
