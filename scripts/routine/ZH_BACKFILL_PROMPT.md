# Claude Code Routine — Chinese backfill for old lessons

Adds a Chinese track (`title_zh` + `cards_zh`) to lessons created before the
Chinese track existed, so Heo can learn any past lesson in Chinese from her
scrapbook. Works through the deployed app's API — no database access needed.

**Needs:** `NEXT_PUBLIC_APP_URL` and `CRON_SECRET` (same as the daily routine).
**Schedule:** hourly (or run by hand) until `remaining` is 0, then disable.
Each run converts up to 3 lessons, oldest first, so the Chinese course builds up
from the simplest lessons.

## ⚠️ Fail-fast rules

- If any `curl` call returns a non-200 status (other than the 400/409 cases in
  Step 3): **stop immediately**, print the error, and do nothing else.
- Do NOT debug, read source files, modify code, or commit anything.
- Your only job is: read worklist → write Chinese tracks → save them.

---

## STEP 1 — Read the worklist

```bash
APP_URL="${NEXT_PUBLIC_APP_URL%/}"
curl -s -w "\nHTTP %{http_code}\n" "$APP_URL/api/notebook/routine/zh-backfill?limit=3" \
  -H "Authorization: Bearer $CRON_SECRET"
```

You get:
- `remaining` — lessons still missing Chinese. If `0`, print `DONE — every lesson has a Chinese track.` and stop.
- `course_words` — hanzi already taught as new words in existing Chinese tracks. Don't introduce these as new again; use them as support words.
- `pages[]` — `{ id, scheduled_for, status, title_vi, title_en, topic, difficulty, cards }`. `cards` is the lesson's English track.

## STEP 2 — Write a Chinese track for each page

For each page, write a Chinese version of the **same lesson**: same topic, same
mood, same card order (intro → word cards → reading → exercises → ask_prompt →
completion), adapted for Chinese rather than translated word for word.

- Learner: Heo, Vietnamese, **absolute beginner in Mandarin** (HSK 1, early HSK 2). She may open any lesson's Chinese version in any order, so each track must stand alone.
- Mandarin, **simplified** characters, pinyin with tone marks on everything.
- 3–5 new words mirroring the English lesson's new words where natural (coffee → 咖啡). If an English word has no beginner-friendly equivalent, pick the most useful beginner word for the topic instead. Avoid `course_words` — and words you already used as new in earlier pages of this same run.
- Add `han_viet` (âm Hán Việt) on word cards when it's a real memory hook (兴奋 → "hưng phấn", 学习 → "học tập", 准备 → "chuẩn bị"). Omit it when it doesn't help.
- Keep sentences short (≈3–10 characters). Reuse the lesson's Vietnamese meanings and tone.
- Vietnamese copy: natural and warm, "Heo"/"Masuri" in third person, never "anh/em/mình/bạn". The words "sai" / "wrong" / "incorrect" never appear in card copy.
- Exercises: keep the same exercise types as the English track where they work in Chinese. `pig_says` and `sentence_remix` targets must be short (2–6 characters) with **one** natural answer — Heo answers in hanzi or toneless pinyin and the app compares exactly.
- `title_zh`: the lesson title in Chinese (e.g. Good Morning → 早上好).

Card schemas and rules are in `scripts/routine/ROUTINE_PROMPT.md` → **STEP 3a**. The
server rejects: non-hanzi `word_zh`, hanzi inside pinyin, mismatched
`sentences_zh/pinyin/vi` lengths, `shuffled_words` that don't rebuild
`target_sentence_zh`, an `imposter_word` that isn't one of `sentence_tokens`,
and `vocab_to_save` entries that don't match a card's `word_zh`.

### Worked example (abridged)

English lesson "How Do You Feel Today?" (happy, tired, calm, excited) →

```json
{
  "title_zh": "你今天感觉怎么样？",
  "cards_zh": [
    { "type": "intro", "title_vi": "Cảm xúc hôm nay 🇨🇳", "subtitle_vi": "Hôm nay Heo cảm thấy thế nào? Nói bằng tiếng Trung nha 💭", "pig_pose": "thinking" },
    { "type": "word", "word_zh": "开心", "pinyin": "kāixīn", "word_vi": "vui", "han_viet": "khai tâm",
      "example_zh": "我今天很开心。", "example_pinyin": "Wǒ jīntiān hěn kāixīn.", "example_vi": "Hôm nay Heo rất vui.", "pos": "adjective", "image_emoji": "😊" },
    { "type": "word", "word_zh": "累", "pinyin": "lèi", "word_vi": "mệt",
      "example_zh": "我有点儿累。", "example_pinyin": "Wǒ yǒudiǎnr lèi.", "example_vi": "Heo hơi mệt một chút.", "pos": "adjective", "image_emoji": "😴" },
    { "type": "word", "word_zh": "放松", "pinyin": "fàngsōng", "word_vi": "thư giãn",
      "example_zh": "我想放松一下。", "example_pinyin": "Wǒ xiǎng fàngsōng yíxià.", "example_vi": "Heo muốn thư giãn một chút.", "pos": "verb", "image_emoji": "🍃" },
    { "type": "word", "word_zh": "兴奋", "pinyin": "xīngfèn", "word_vi": "hào hứng / phấn khích", "han_viet": "hưng phấn",
      "example_zh": "我们要去旅行，我很兴奋！", "example_pinyin": "Wǒmen yào qù lǚxíng, wǒ hěn xīngfèn!", "example_vi": "Sắp đi du lịch rồi, Heo hào hứng lắm!", "pos": "adjective", "image_emoji": "✨" },
    { "type": "reading", "title_vi": "Một ngày của Heo",
      "sentences_zh": ["今天我很开心，也有点儿累。", "现在我想放松一下。", "和Masuri说话，我很兴奋！"],
      "sentences_pinyin": ["Jīntiān wǒ hěn kāixīn, yě yǒudiǎnr lèi.", "Xiànzài wǒ xiǎng fàngsōng yíxià.", "Hé Masuri shuōhuà, wǒ hěn xīngfèn!"],
      "sentences_vi": ["Hôm nay Heo rất vui, cũng hơi mệt một chút.", "Bây giờ Heo muốn thư giãn một chút.", "Nói chuyện với Masuri, Heo hào hứng lắm!"],
      "vocab_highlights": ["开心", "累", "放松", "兴奋"] },
    { "type": "exercise", "exercise_type": "word_train", "can_skip": true,
      "data": { "target_sentence_zh": "我今天很开心。", "target_sentence_pinyin": "Wǒ jīntiān hěn kāixīn.", "shuffled_words": ["开心", "我", "很", "今天"], "hint_vi": "Hôm nay Heo rất vui." } },
    { "type": "exercise", "exercise_type": "spot_imposter", "can_skip": true,
      "data": { "sentence_tokens": ["我", "是", "累"], "imposter_word": "是", "correct_word": "很", "hint_vi": "Tiếng Trung không dùng 是 trước tính từ — thử tìm từ kì kì nha" } },
    { "type": "exercise", "exercise_type": "pig_says", "can_skip": true,
      "data": { "prompt_vi": "Heo rất hào hứng", "target_zh": "我很兴奋", "target_pinyin": "Wǒ hěn xīngfèn", "hints": { "noun": "兴奋" } } },
    { "type": "ask_prompt", "suggestion_vi": "Có từ nào khó không? Hỏi Masuri nha 💕" },
    { "type": "completion", "vocab_to_save": ["开心", "累", "放松", "兴奋"], "sticker_kind": "sparkle" }
  ]
}
```

## STEP 3 — Self-check, then save each page

Before saving, check every card:
- [ ] Every hanzi sentence is natural Mandarin a native speaker would say (errors get internalized — this is critical)
- [ ] Pinyin matches the hanzi character-for-character with correct tones (一/不 sandhi spellings: yíxià, bú shì)
- [ ] Vietnamese meanings are natural, not overly literal
- [ ] Beginner level; no heavy content (politics, religion, illness, death)
- [ ] Token arrays rebuild their target sentences exactly; `vocab_to_save` matches `word_zh`

Save one page at a time:

```bash
APP_URL="${NEXT_PUBLIC_APP_URL%/}"
curl -s -w "\nHTTP %{http_code}\n" -X POST "$APP_URL/api/notebook/routine/zh-backfill" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "page_id": "<id>", "title_zh": "...", "cards_zh": [ ... ] }'
```

- `200 { ok: true }` → next page.
- `400` with `details` → fix exactly those problems and POST that page once more. If it fails again, print the details and move on to the next page.
- `409 already_done` → someone else filled it; move on.

When the batch is done, print `Backfilled <n> lessons — <remaining - n> to go.`
