# Claude Code Routine — Heo & Masuri Sổ tiếng Anh

**Schedule:** Any time daily — morning is fine.

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
- `[MASURI_HINT]` — If present, Masuri's instruction for the next page. **Honor it fully.**
- `[ARCHIVED_LESSON]` — If present alongside `[MASURI_HINT]`, this is the full content of the lesson that was archived for regeneration. **Use it as your base — revise it according to the hint rather than building from scratch.**

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
