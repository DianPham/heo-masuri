# Claude Code Routine — Heo & Masuri Sổ tiếng Anh

**Schedule:** Any time daily — morning is fine.

> The routine now maintains a 3-day buffer. It always creates a lesson for the
> next uncovered date, so it does not matter when Heo finishes her current lesson.
> If all 3 slots are already filled, the routine skips silently.

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
- `next_needed_date` — **check this first.** The first future date with no lesson queued. If `null`, 3 days are already covered — stop.
- `queued_dates` — dates that already have a lesson (draft/approved/published). For your reference.
- `last_pages` — recent 7 published pages (avoid repeating topic immediately)
- `recent_vocab` — words she has saved (bias content to use these — recognition is rewarding)
- `low_confidence_vocab` — words she rated "show me again" (weave in invisibly)
- `preferred_topics` — her preferred topic tags
- `[MASURI_HINT]` — if present, this is Masuri's instruction for the next page. **Honor it.**

**⚠️ If `next_needed_date` is null: stop immediately.**
Print: `SKIP — Buffer full. Already have lessons queued for 3 days ahead. Nothing to do.`
Do not proceed to Step 2. Do nothing else.

### STEP 2 — Plan tomorrow's page

- Use `next_needed_date` as the `scheduled_for` value for this lesson
- Pick ONE topic from `preferred_topics`, biased away from the last 3 topics in `last_pages`
- Pick difficulty 1 or 2 (rarely 3)
- Choose 3–5 NEW vocabulary words (not in `recent_vocab`)
- Choose 1–2 REVIEW words from `low_confidence_vocab` to weave in invisibly

### STEP 3 — Generate the page JSON

Build a JSON object with this exact structure:

```json
{
  "scheduled_for": "<next_needed_date from Step 1>",
  "title_vi": "...",
  "title_en": "...",
  "topic": "...",
  "difficulty": 1,
  "cards": [...],
  "generation_meta": {
    "new_vocab": ["word1", "word2"],
    "review_vocab": ["word3"]
  }
}
```

**Card structure — always follow this order:**
1. One `intro` card (warm Vietnamese greeting)
2. Three to five `word` cards (each new vocabulary word)
3. One `reading` card (2–3 sentences using today's vocab)
4. Two to three `exercise` cards (mix of types)
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

Fix any issues before proceeding.

### STEP 5 — Save the draft and notify Masuri

POST the page JSON to the app. This saves it as a draft AND sends the Discord ping + push to Masuri automatically:

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
- All English must be A1–A2 level
- Never produce heavy content (politics, religion, illness, death)
- Do not invent fake personal details about Heo or Masuri
- If `[MASURI_HINT]` is present in Step 1's output, honor it fully
- The word "wrong" / "incorrect" / "sai" must never appear in user-facing card copy
- No AI reply suggestions to Ask Masuri — the wait is the feature
