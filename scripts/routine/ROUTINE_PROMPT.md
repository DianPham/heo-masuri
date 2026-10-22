# Claude Code Routine — Heo & Masuri Sổ học (English + 中文)

**Schedule:** Any time daily — morning is fine.

> Every lesson has two tracks: English (`cards`) and Chinese (`cards_zh`).
> Heo picks which language to start in; the other stays open to learn later.
> Older lessons without a Chinese track are filled by a separate prompt,
> `scripts/routine/ZH_BACKFILL_PROMPT.md` — not this routine.

> The routine maintains a 2-day buffer. It always creates a lesson for the
> next uncovered date. If both buffer slots are already filled, the routine skips silently.
> If Masuri has flagged a lesson for regeneration, the routine fills that gap REGARDLESS
> of how many unpublished lessons exist — Masuri's hint is an explicit override.

Everything goes through the deployed app's API — no direct database access needed.

## ⚠️ IMPORTANT — fail-fast rules

- If any `curl` call returns a non-200 status or fails: **stop immediately**, print the error, and do nothing else.
- Do NOT attempt to debug, read source files, check git logs, modify code, or commit anything.
- Do NOT try alternative approaches. Just report what failed and exit.
- Your only job is: read state → generate JSON → save draft. Nothing else.

---

## Steps

### STEP 0 — Pre-flight check

```bash
APP_URL="${NEXT_PUBLIC_APP_URL%/}"   # strip trailing slash if any
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/notebook/routine/state" \
  -H "Authorization: Bearer $CRON_SECRET")
echo "Status: $STATUS"
```

If status is not `200`: print `ERROR: API returned $STATUS. Stopping.` and stop. Do not continue.

### STEP 1 — Read Heo's current state

```bash
APP_URL="${NEXT_PUBLIC_APP_URL%/}"
curl -s "$APP_URL/api/notebook/routine/state" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Parse the JSON output. You will receive:

- `next_needed_date` — The first future date with no lesson queued. If `null`, the buffer is full — stop.
- `unpublished_count` — Total draft/approved future lessons awaiting publish.
- `queued_dates` — Dates that already have a lesson (any status). For reference.
- `queued_page_details` — Array of `{ date, topic, title_en }` for unpublished queued lessons. **Avoid repeating these topics.**
- `last_pages` — Recent 7 published pages (avoid repeating topic immediately)
- `recent_vocab` — Last 30 saved words with full details (pos, confidence, topic)
- `all_known_words` — **Every** word Heo has ever saved, as a flat string array. Do NOT introduce any of these as "new" vocabulary. You MAY use them freely as support words, in exercises, and in reading sentences.
- `low_confidence_vocab` — Words she rated "show me again" — weave these in invisibly as review
- `preferred_topics` — Her preferred topic tags
- `zh` — Chinese-track context:
  - `zh.course_words` — hanzi already introduced as new words in existing Chinese tracks. Do NOT introduce these as new again; use them freely as support words.
  - `zh.known_words` — hanzi Heo saved to her vocab book from Chinese lessons
  - `zh.low_confidence_vocab` — `{ word_zh, pinyin, word_vi }` she marked "show me again" — weave 1 into the Chinese exercises when present
  - `zh.backfill_remaining` — older lessons still missing Chinese (informational only)
- `[MASURI_HINT]` — If present, Masuri's instruction for the next page. **Honor it fully.**
- `[ARCHIVED_LESSON]` — If present alongside `[MASURI_HINT]`, this is the full content of the lesson that was archived for regeneration (both tracks: `cards` and, if it had one, `cards_zh`). **Use it as your base — revise it according to the hint rather than building from scratch.**

**⚠️ When to stop — check in this order:**

1. If `next_needed_date` is `null` → **STOP.** Buffer is completely full.
   Print: `SKIP — Buffer full (next_needed_date=null, unpublished_count=<value>). Nothing to do.`

2. If `[MASURI_HINT]` is present → **NEVER stop due to unpublished_count.** Masuri has explicitly requested a regeneration for this date. Always generate, regardless of how many lessons are already queued.

3. If `unpublished_count` ≥ 2 AND `[MASURI_HINT]` is NOT present → **STOP.**
   Print: `SKIP — unpublished_count=<value> already ≥ 2, buffer healthy. Nothing to do.`

Only proceed to Step 2 if none of the stop conditions above triggered.

### STEP 2 — Plan the page

- Use `next_needed_date` as `scheduled_for`
- **If `[ARCHIVED_LESSON]` is present:** treat it as the base to revise. Keep vocabulary, structure, and exercises that are already good. Apply the `[MASURI_HINT]` changes to the content, tone, theme, or whatever the hint specifies. You are editing, not rebuilding.
- **If `[ARCHIVED_LESSON]` is absent:** build from scratch using the guidelines below.
- Pick ONE topic from `preferred_topics`. **Check `queued_page_details` and `last_pages` — avoid any topic that already appears in those lists.**
- Pick difficulty 1 or 2 (rarely 3)
- Choose 3–5 NEW vocabulary words that do NOT appear in `all_known_words`
- Pick 1–2 words from `low_confidence_vocab` to weave in invisibly as review (in exercises and reading sentences — don't announce them as "review")

**Vocab rules:**
- `all_known_words` = words Heo already knows → use freely as support/context, do NOT introduce as new
- `low_confidence_vocab` ⊆ `all_known_words` → these need reinforcement → target them in exercises
- New words must be genuinely new (not in `all_known_words`) and A1–A2 level

**Chinese track plan** (same topic, same day — written for a Vietnamese beginner):
- Mandarin, **simplified** characters, pinyin with tone marks.
- Level: absolute beginner (HSK 1, early HSK 2). Heo may open any lesson's Chinese version in any order, so every Chinese track must stand on its own — pinyin on everything, short sentences (≈3–10 characters).
- 3–5 new words that mirror the English lesson's concepts where natural; otherwise pick the most useful beginner words for the topic. Avoid `zh.course_words` as new words.
- Add `han_viet` (âm Hán Việt) on word cards when the Sino-Vietnamese reading helps Heo remember (兴奋 → "hưng phấn", 学习 → "học tập"). Omit it when it doesn't help (累 → "luỹ" means nothing to her).

### STEP 3 — Generate the page JSON

Build a JSON object with this exact structure:

```json
{
  "scheduled_for": "<next_needed_date from Step 1>",
  "title_vi": "...",
  "title_en": "...",
  "title_zh": "...",
  "topic": "...",
  "difficulty": 1,
  "cards": [...],
  "cards_zh": [...],
  "generation_meta": {
    "new_vocab": ["word1", "word2"],
    "review_vocab": ["word3"],
    "revised_from_hint": true
  }
}
```

Set `"revised_from_hint": true` only when revising an `[ARCHIVED_LESSON]`. Omit otherwise.

**Card structure — always follow this order:**
1. One `intro` card (warm Vietnamese greeting)
2. Three to five `word` cards (each new vocabulary word)
3. One `reading` card (2–3 sentences using today's vocab — also use words from `all_known_words` naturally, and sneak `low_confidence_vocab` words into the sentences)
4. Two to three `exercise` cards (mix of types — at least one should target a `low_confidence_vocab` word)
5. One `ask_prompt` card (optional)
6. One `completion` card (always last)

**Card schemas:**
```json
{ "type": "intro", "title_vi": "...", "subtitle_vi": "...", "pig_pose": "studying" }

{ "type": "word", "word_en": "happy", "word_vi": "vui / hạnh phúc",
  "example_en": "I feel happy today", "example_vi": "Hôm nay Heo cảm thấy vui",
  "pos": "adj", "image_emoji": "😊" }

{ "type": "reading",
  "sentences_en": ["I drink coffee every morning."],
  "sentences_vi": ["Buổi sáng nào Heo cũng uống cà phê."],
  "vocab_highlights": ["coffee"] }

{ "type": "exercise", "exercise_type": "word_train", "can_skip": true,
  "data": { "target_sentence_en": "I drink coffee every morning",
            "shuffled_words": ["coffee","I","every","drink","morning"],
            "hint_vi": "Buổi sáng nào Heo cũng uống cà phê" } }

{ "type": "exercise", "exercise_type": "spot_imposter", "can_skip": true,
  "data": { "sentence_en": "I am very happily today",
            "imposter_word": "happily", "correct_word": "happy",
            "hint_vi": "Có một từ kì kì..." } }

{ "type": "exercise", "exercise_type": "pig_says", "can_skip": true,
  "data": { "prompt_vi": "Hôm nay Heo cảm thấy vui",
            "target_en": "I feel happy today",
            "hints": { "verb": "feel", "noun": "happy" } } }

{ "type": "exercise", "exercise_type": "caption_polaroid", "can_skip": true,
  "data": { "image_emoji": "☕",
            "image_url": "https://images.unsplash.com/photo-xxx?w=600&q=80",
            "starter_words": ["I","drink","morning"],
            "example_en": "I drink coffee every morning" } }

{ "type": "exercise", "exercise_type": "sentence_remix", "can_skip": true,
  "data": { "base_en": "I am happy today", "base_vi": "Hôm nay Heo vui",
            "instruction_vi": "Đổi câu này thành nói về hôm qua",
            "target_en": "I was happy yesterday",
            "hint_words": ["was","yesterday"] } }

{ "type": "ask_prompt", "suggestion_vi": "Có từ nào khó không? Hỏi Masuri nha 💕" }

{ "type": "completion",
  "vocab_to_save": ["morning","happy","coffee"],
  "sticker_kind": "flower_rose" }
```

Valid `sticker_kind` values: `heart_filled`, `heart_outline`, `star_filled`, `star_outline`, `sparkle`, `bow_pink`, `bow_butter`, `flower_rose`, `flower_daisy`, `cloud`, `sun`, `moon`, `coffee_cup`, `book`, `pencil`, `letter`, `pig_mini`

### STEP 3a — Generate the Chinese track (`title_zh` + `cards_zh`)

Same card order and rules as the English track (intro first, completion last, 6–12 cards).
Vietnamese copy (`title_vi`, `subtitle_vi`, `hint_vi`, `prompt_vi`, `instruction_vi`,
`suggestion_vi`) is written for the Chinese lesson. Chinese has no spaces, so anything
the app turns into chips is an explicit token array.

```json
{ "type": "intro", "title_vi": "Cảm xúc hôm nay 🇨🇳", "subtitle_vi": "...", "pig_pose": "thinking" }

{ "type": "word", "word_zh": "兴奋", "pinyin": "xīngfèn", "word_vi": "hào hứng",
  "han_viet": "hưng phấn",
  "example_zh": "我很兴奋！", "example_pinyin": "Wǒ hěn xīngfèn!", "example_vi": "Heo hào hứng lắm!",
  "pos": "adjective", "image_emoji": "✨" }

{ "type": "reading", "title_vi": "...",
  "sentences_zh": ["今天我很开心，也有点儿累。"],
  "sentences_pinyin": ["Jīntiān wǒ hěn kāixīn, yě yǒudiǎnr lèi."],
  "sentences_vi": ["Hôm nay Heo rất vui, cũng hơi mệt một chút."],
  "vocab_highlights": ["开心", "累"] }

{ "type": "exercise", "exercise_type": "word_train", "can_skip": true,
  "data": { "target_sentence_zh": "我今天很开心。", "target_sentence_pinyin": "Wǒ jīntiān hěn kāixīn.",
            "shuffled_words": ["开心", "我", "很", "今天"],
            "hint_vi": "Hôm nay Heo rất vui." } }

{ "type": "exercise", "exercise_type": "spot_imposter", "can_skip": true,
  "data": { "sentence_tokens": ["我", "是", "累"], "imposter_word": "是", "correct_word": "很",
            "hint_vi": "Tiếng Trung không dùng 是 trước tính từ..." } }

{ "type": "exercise", "exercise_type": "pig_says", "can_skip": true,
  "data": { "prompt_vi": "Heo rất hào hứng", "target_zh": "我很兴奋", "target_pinyin": "Wǒ hěn xīngfèn",
            "hints": { "noun": "兴奋" } } }

{ "type": "exercise", "exercise_type": "caption_polaroid", "can_skip": true,
  "data": { "image_emoji": "☕", "starter_words": ["我", "喝", "咖啡"],
            "example_zh": "我喝咖啡。", "example_pinyin": "Wǒ hē kāfēi." } }

{ "type": "exercise", "exercise_type": "sentence_remix", "can_skip": true,
  "data": { "base_zh": "我很累", "base_pinyin": "Wǒ hěn lèi", "base_vi": "Heo rất mệt",
            "instruction_vi": "Đổi thành câu hỏi: \"Bạn có mệt không?\" (dùng 你 và 吗)",
            "target_zh": "你累吗", "target_pinyin": "Nǐ lèi ma", "hint_words": ["你", "吗"] } }

{ "type": "exercise", "exercise_type": "two_truths", "can_skip": true,
  "data": { "prompt_vi": "...", "starter_words": ["我", "喜欢", "不"] } }

{ "type": "ask_prompt", "suggestion_vi": "Có từ nào khó không? Hỏi Masuri nha 💕" }

{ "type": "completion", "vocab_to_save": ["开心", "累", "兴奋"], "sticker_kind": "sparkle" }
```

**Chinese-specific rules (the server rejects violations):**
- `word_zh` is hanzi; `pinyin`/`*_pinyin` are pinyin only (tone marks, words separated by spaces, e.g. `Wǒ xǐhuan hē kāfēi.`).
- `sentences_zh`, `sentences_pinyin`, `sentences_vi` have the same length.
- `word_train.shuffled_words`: word-level tokens (2–6), shuffled, that rebuild `target_sentence_zh` exactly (punctuation excluded).
- `spot_imposter.sentence_tokens`: the sentence split into words in order, with `imposter_word` as one of the tokens. Good imposters are classic beginner slips: 是 before an adjective, 不 vs 没, a wrong measure word, wrong word order.
- `pig_says` / `sentence_remix` targets: short (2–6 characters) with **one** natural answer — Heo answers in hanzi or toneless pinyin and the app compares exactly.
- `completion.vocab_to_save` lists hanzi that exactly match `word_zh` of the word cards.

### STEP 3b — Fetch image for caption_polaroid (optional but preferred)

If the page includes a `caption_polaroid` exercise, try to find a real photo that fits the scene.

**How to find one:**
1. Use WebSearch or WebFetch to search Unsplash for a relevant photo:
   ```
   https://unsplash.com/s/photos/{keyword}
   ```
2. Open the photo page and copy the **direct image URL** — it looks like:
   ```
   https://images.unsplash.com/photo-XXXXXXXXXXXX-XXXXXXXXXXXX?w=600&q=80
   ```
   Always append `?w=600&q=80` to keep the file small.
3. Add this as `image_url` in the `caption_polaroid` data.

**Rules:**
- Only use images from Unsplash (unsplash.com) — they are free for all uses
- The photo must be safe, warm, and match the exercise scene (food, cafe, nature, etc.)
- If you cannot find a suitable photo in one attempt, skip `image_url` entirely — the emoji fallback will show instead. Do NOT delay or retry.
- `image_url` is optional. A missing `image_url` is fine. A broken or wrong URL is not.

### STEP 4 — Self-critique checklist

Before saving, verify every card:
- [ ] Every English sentence is grammatically correct (errors get internalized as right answers — this is critical)
- [ ] No English sounds unnatural for a native speaker
- [ ] No Vietnamese translation is awkward or overly literal
- [ ] Difficulty is consistent with 1 or 2 (no advanced vocab, no complex grammar)
- [ ] The words "sai" / "incorrect" / "wrong" appear nowhere in user-facing copy
- [ ] Tone is warm but not infantilizing
- [ ] No heavy content (politics, religion, illness, death)
- [ ] First card is `intro`, last card is `completion`, 6–10 cards total
- [ ] No new word appears in `all_known_words` (they should be in `all_known_words` after this lesson, not already in it)
- [ ] Topic does not repeat any topic in `queued_page_details` or the last 3 entries of `last_pages`
- [ ] At least one exercise uses a `low_confidence_vocab` word as its target
- [ ] Chinese track: every hanzi sentence is natural Mandarin a native speaker would say, and its pinyin matches character-for-character with correct tones (use 一/不 tone-sandhi spellings: yíxià, bú shì)
- [ ] Chinese track: beginner level, simplified characters, every new word has pinyin + Vietnamese meaning
- [ ] Chinese track: no new word is in `zh.course_words`; `vocab_to_save` matches the `word_zh` values exactly
- [ ] Chinese track: chip/token arrays rebuild their target sentences exactly

Fix any issues before proceeding.

### STEP 5 — Save the draft and notify Masuri

POST the page JSON (both tracks) to the app. This saves it as a draft AND sends the Discord ping + push to Masuri automatically. If the response is a 400 listing `cards_zh[...]` errors, fix the Chinese track and POST again once; if it still fails, POST without `title_zh`/`cards_zh` (the backfill prompt will add it later) and print the errors:

```bash
APP_URL="${NEXT_PUBLIC_APP_URL%/}"
curl -s -X POST "$APP_URL/api/notebook/routine/draft" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '<your page JSON here>'
```

If the response does not contain `page_id`: print the response as an error and stop.

The response will contain `{ "page_id": "...", "approve_url": "..." }`. That's it — done.

---

## Critical constraints

- All Vietnamese must be natural and warm. Use "Heo" and "Masuri" as third-person; never use "anh/em/mình/bạn"
- All English must be A1–A2 level; all Chinese must be HSK 1–2 level with pinyin
- Never produce heavy content (politics, religion, illness, death)
- Do not invent fake personal details about Heo or Masuri
- If `[MASURI_HINT]` is present in Step 1's output, honor it fully
- The word "wrong" / "incorrect" / "sai" must never appear in user-facing card copy
- No AI reply suggestions to Ask Masuri — the wait is the feature
