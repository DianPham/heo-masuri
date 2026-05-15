# Claude Code Routine — Heo & Masuri Sổ tiếng Anh

**Schedule:** Daily at 21:00 Asia/Ho_Chi_Minh (14:00 UTC)
**Platform:** Claude Code Routines (cloud), configured at claude.ai/code/scheduled

---

## What you are doing

You are generating tomorrow's English learning page for Phương (nickname: Heo), a Vietnamese woman who:
- Knows English grammar but has forgotten most of it; "near-zero productive skill"
- Is afraid of being wrong with English — anxiety-first design is non-negotiable
- Wants to feel safe, capable, and enjoy the experience
- Is at roughly CEFR A1–A2

Each page is a Stories-format JSON object with 6–10 cards. Cards must be cute, cozy, low-anxiety, and personally relevant.

---

## Steps

### STEP 1 — Read Heo's current state

Run:
```
npx tsx scripts/routine/read_heo_state.ts
```

Parse the JSON output. You will receive:
- `tomorrow` — the date string to use for `scheduled_for`
- `last_pages` — recent 7 published pages (avoid repeating topic immediately)
- `recent_vocab` — words she has saved (bias new content to use these — recognition is rewarding)
- `low_confidence_vocab` — words she rated as "show me again" (weave in invisibly)
- `preferred_topics` — her preferred topic tags
- `difficult_card_history` — exercise types she found hard recently
- `[MASURI_HINT]` — if present, this is Masuri's hand-written instruction for today's page. **Honor it.**

### STEP 2 — Plan tomorrow's page

- Pick ONE topic from `preferred_topics`, biased away from the last 3 topics in `last_pages`
- Pick difficulty 1 or 2 (rarely 3)
- Choose 3–5 NEW vocabulary words (not in `recent_vocab`)
- Choose 1–2 REVIEW words from `low_confidence_vocab` to weave in invisibly

### STEP 3 — Generate cards JSON

Always follow this structure:
1. **intro card** — warm Vietnamese greeting
2. **word cards** (3–5) — each new vocab word with example
3. **reading card** (1) — 2–3 sentences using today's vocab + review words
4. **exercise cards** (2–3) — mix of exercise types
5. **ask_prompt card** (1, optional) — soft prompt "Có gì khó hiểu không?"
6. **completion card** (1, always last) — vocab_to_save + sticker_kind

#### Card schemas

```json
// intro
{ "type": "intro", "title_vi": "...", "subtitle_vi": "...", "pig_pose": "studying" }

// word
{ "type": "word", "word_en": "happy", "word_vi": "vui / hạnh phúc",
  "example_en": "I feel happy today", "example_vi": "Hôm nay Heo cảm thấy vui",
  "pos": "adj", "image_emoji": "😊" }

// reading
{ "type": "reading", "title_vi": "Đọc nhé",
  "sentences_en": ["I drink coffee every morning.", "It makes me feel calm."],
  "sentences_vi": ["Buổi sáng nào Heo cũng uống cà phê.", "Nó làm Heo cảm thấy bình yên."],
  "vocab_highlights": ["coffee", "calm"] }

// exercise — word_train
{ "type": "exercise", "exercise_type": "word_train", "can_skip": true,
  "data": { "target_sentence_en": "I drink coffee every morning",
            "shuffled_words": ["coffee", "I", "every", "drink", "morning"],
            "hint_vi": "Buổi sáng nào Heo cũng uống cà phê" } }

// exercise — spot_imposter
{ "type": "exercise", "exercise_type": "spot_imposter", "can_skip": true,
  "data": { "sentence_en": "I am very happily today",
            "imposter_word": "happily", "correct_word": "happy",
            "hint_vi": "Có một từ kì kì..." } }

// exercise — pig_says
{ "type": "exercise", "exercise_type": "pig_says", "can_skip": true,
  "data": { "prompt_vi": "Hôm nay Heo cảm thấy vui",
            "target_en": "I feel happy today",
            "hints": { "verb": "feel", "noun": "happy" } } }

// exercise — caption_polaroid
{ "type": "exercise", "exercise_type": "caption_polaroid", "can_skip": true,
  "data": { "image_emoji": "☕", "starter_words": ["I", "drink", "morning"],
            "example_en": "I drink coffee every morning" } }

// exercise — sentence_remix
{ "type": "exercise", "exercise_type": "sentence_remix", "can_skip": true,
  "data": { "base_en": "I am happy today", "base_vi": "Hôm nay Heo vui",
            "instruction_vi": "Đổi câu này thành nói về hôm qua",
            "target_en": "I was happy yesterday",
            "hint_words": ["was", "yesterday"] } }

// ask_prompt
{ "type": "ask_prompt", "suggestion_vi": "Có từ nào khó không? Hỏi Masuri nha 💕" }

// completion
{ "type": "completion",
  "vocab_to_save": ["morning", "happy", "coffee"],
  "sticker_kind": "flower_rose" }
```

Valid `sticker_kind` values: `heart_filled`, `heart_outline`, `star_filled`, `star_outline`, `sparkle`, `bow_pink`, `bow_butter`, `flower_rose`, `flower_daisy`, `cloud`, `sun`, `moon`, `coffee_cup`, `book`, `pencil`, `letter`, `pig_mini`

### STEP 4 — Self-critique checklist

Before writing the draft, re-read every card and check:
- [ ] Every English sentence is grammatically correct — errors get internalized as right answers
- [ ] No English sentence sounds unnatural for a native speaker
- [ ] No Vietnamese translation is awkward or overly literal
- [ ] Difficulty is consistent with 1 or 2 (no advanced vocabulary, no complex grammar)
- [ ] No word "sai" / "incorrect" / "wrong" appears anywhere in user-facing copy
- [ ] Tone is warm but not infantilizing — treat her as a smart adult who happens to be learning
- [ ] No content involving: politics, religion, illness, death, or anything heavy
- [ ] First card is `intro`, last card is `completion`
- [ ] 6–10 cards total

If any check fails, fix it before proceeding.

### STEP 5 — Write the draft

Assemble the final JSON object:
```json
{
  "scheduled_for": "<tomorrow YYYY-MM-DD from Step 1>",
  "title_vi": "...",
  "title_en": "...",
  "topic": "...",
  "difficulty": 1,
  "cards": [...],
  "generation_meta": {
    "model": "claude-opus-4-5",
    "prompt_version": "v1.0",
    "new_vocab": ["word1", "word2"],
    "review_vocab": ["word3"]
  }
}
```

Run:
```
echo '<json>' | npx tsx scripts/routine/write_draft_page.ts
```

Capture the output — it contains `{ "page_id": "uuid" }`.

### STEP 6 — Notify Masuri

Run with the page_id from Step 5:
```
npx tsx scripts/routine/notify_masuri.ts --page-id <page_id>
```

This sends a Discord ping to #notebook-review and a push notification.

---

## Critical constraints

- All Vietnamese must be natural and warm. Default tone uses "Heo" and "Masuri" as third-person; never use "anh/em/mình/bạn"
- All English must be A1–A2 level. Avoid: phrasal verbs unless taught, conditionals beyond first conditional, perfect tenses unless explicitly the topic, idioms
- No metaphors that don't translate cleanly between Vietnamese and English
- Never produce content involving: politics, religion, illness, death, or anything that could feel heavy
- Do not invent fake personal details about Heo or Masuri
- If `[MASURI_HINT]` is present in Heo's state, treat it as a hand-written instruction and honor it fully
- The word "wrong" / "incorrect" / "sai" must never appear in user-facing card copy

---

## Working directory

The project root is `C:\Dian\QP` (or the repository root on the cloud runner).
All scripts use `.env.local` for credentials.
