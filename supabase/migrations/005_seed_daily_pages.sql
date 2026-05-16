-- ============================================================
-- Heo & Masuri — CP10 seed: 7 starter daily pages for Heo
-- Safe to run multiple times (inserts only if page not already present).
-- Scheduled Mon 2026-05-18 → Sun 2026-05-24.
-- Run in the Supabase SQL editor.
-- ============================================================

do $$
declare
  heo_id uuid;
begin
  select id into heo_id from public.users where slug = 'heo';
  if heo_id is null then
    raise notice 'Heo user not found — skipping seed.';
    return;
  end if;

  -- ── Day 1: Greetings ─────────────────────────────────────────
  insert into public.daily_pages (
    for_user, scheduled_for, topic, difficulty,
    title_vi, title_en, status, generated_by, cards
  )
  select
    heo_id, '2026-05-18', 'greeting', 1,
    'Chào buổi sáng', 'Good Morning',
    'published', 'manual',
    '[
      {
        "type": "intro",
        "title_vi": "Chào buổi sáng!",
        "subtitle_vi": "Hôm nay em học chào hỏi cơ bản nhé 🌸",
        "pig_pose": "cheering"
      },
      {
        "type": "word",
        "word_en": "hello",
        "word_vi": "xin chào",
        "example_en": "Hello! Nice to meet you.",
        "example_vi": "Xin chào! Rất vui được gặp anh.",
        "pos": "exclamation",
        "image_emoji": "👋"
      },
      {
        "type": "word",
        "word_en": "morning",
        "word_vi": "buổi sáng",
        "example_en": "Good morning! How are you today?",
        "example_vi": "Chào buổi sáng! Hôm nay anh có khoẻ không?",
        "pos": "noun",
        "image_emoji": "🌅"
      },
      {
        "type": "word",
        "word_en": "today",
        "word_vi": "hôm nay",
        "example_en": "Today is a beautiful day.",
        "example_vi": "Hôm nay là một ngày đẹp trời.",
        "pos": "adverb",
        "image_emoji": "📅"
      },
      {
        "type": "reading",
        "title_vi": "Em chào anh",
        "sentences_en": [
          "Good morning, Masuri!",
          "Today is a new day.",
          "I feel happy to see you."
        ],
        "sentences_vi": [
          "Chào buổi sáng, Masuri!",
          "Hôm nay là một ngày mới.",
          "Em cảm thấy vui khi gặp anh."
        ],
        "vocab_highlights": ["morning", "today", "happy"]
      },
      {
        "type": "exercise",
        "exercise_type": "word_train",
        "can_skip": false,
        "data": {
          "target_sentence_en": "Good morning! How are you today?",
          "shuffled_words": ["morning!", "Good", "today?", "are", "How", "you"],
          "hint_vi": "Chào buổi sáng! Hôm nay anh có khoẻ không?"
        }
      },
      {
        "type": "ask_prompt",
        "suggestion_vi": "Hỏi anh: buổi sáng của anh thường bắt đầu như thế nào?"
      },
      {
        "type": "completion",
        "vocab_to_save": ["hello", "morning", "today"],
        "sticker_kind": "star_filled"
      }
    ]'::jsonb
  where not exists (
    select 1 from public.daily_pages
    where for_user = heo_id and scheduled_for = '2026-05-18'
  );

  -- ── Day 2: Feelings ──────────────────────────────────────────
  insert into public.daily_pages (
    for_user, scheduled_for, topic, difficulty,
    title_vi, title_en, status, generated_by, cards
  )
  select
    heo_id, '2026-05-19', 'feelings', 1,
    'Hôm nay em cảm thấy gì?', 'How Do You Feel Today?',
    'published', 'manual',
    '[
      {
        "type": "intro",
        "title_vi": "Cảm xúc hôm nay",
        "subtitle_vi": "Hôm nay em cảm thấy thế nào? 💭",
        "pig_pose": "thinking"
      },
      {
        "type": "word",
        "word_en": "happy",
        "word_vi": "vui / hạnh phúc",
        "example_en": "I am so happy to talk to you!",
        "example_vi": "Em rất vui khi được nói chuyện với anh!",
        "pos": "adjective",
        "image_emoji": "😊"
      },
      {
        "type": "word",
        "word_en": "tired",
        "word_vi": "mệt",
        "example_en": "I feel tired after a long day.",
        "example_vi": "Em cảm thấy mệt sau một ngày dài.",
        "pos": "adjective",
        "image_emoji": "😴"
      },
      {
        "type": "word",
        "word_en": "calm",
        "word_vi": "bình yên / thư giãn",
        "example_en": "I feel calm when I drink tea.",
        "example_vi": "Em cảm thấy thư giãn khi uống trà.",
        "pos": "adjective",
        "image_emoji": "🍃"
      },
      {
        "type": "word",
        "word_en": "excited",
        "word_vi": "hào hứng / phấn khích",
        "example_en": "I am so excited about our trip!",
        "example_vi": "Em rất hào hứng về chuyến đi của chúng mình!",
        "pos": "adjective",
        "image_emoji": "✨"
      },
      {
        "type": "reading",
        "title_vi": "Ngày của em",
        "sentences_en": [
          "Today I feel happy and a little tired.",
          "I worked a lot, but I am calm now.",
          "Talking to Masuri makes me so excited!"
        ],
        "sentences_vi": [
          "Hôm nay em vui vẻ và hơi mệt một chút.",
          "Em làm việc nhiều, nhưng bây giờ em thấy bình yên.",
          "Nói chuyện với Masuri làm em hào hứng lắm!"
        ],
        "vocab_highlights": ["happy", "tired", "calm", "excited"]
      },
      {
        "type": "exercise",
        "exercise_type": "spot_imposter",
        "can_skip": false,
        "data": {
          "sentence_en": "I feel calm and relax after yoga.",
          "imposter_word": "relax",
          "correct_word": "relaxed",
          "hint_vi": "Sau yoga, em thấy bình yên và... (dùng tính từ nha)"
        }
      },
      {
        "type": "ask_prompt",
        "suggestion_vi": "Hỏi anh: khi nào anh cảm thấy calm nhất?"
      },
      {
        "type": "completion",
        "vocab_to_save": ["happy", "tired", "calm", "excited"],
        "sticker_kind": "sparkle"
      }
    ]'::jsonb
  where not exists (
    select 1 from public.daily_pages
    where for_user = heo_id and scheduled_for = '2026-05-19'
  );

  -- ── Day 3: Coffee date ───────────────────────────────────────
  insert into public.daily_pages (
    for_user, scheduled_for, topic, difficulty,
    title_vi, title_en, status, generated_by, cards
  )
  select
    heo_id, '2026-05-20', 'food', 1,
    'Buổi cà phê', 'Coffee Date',
    'published', 'manual',
    '[
      {
        "type": "intro",
        "title_vi": "Cà phê buổi sáng ☕",
        "subtitle_vi": "Em học gọi đồ uống bằng tiếng Anh nào!",
        "pig_pose": "cheering"
      },
      {
        "type": "word",
        "word_en": "coffee",
        "word_vi": "cà phê",
        "example_en": "I would like a coffee, please.",
        "example_vi": "Cho em một cà phê nhé.",
        "pos": "noun",
        "image_emoji": "☕"
      },
      {
        "type": "word",
        "word_en": "sweet",
        "word_vi": "ngọt",
        "example_en": "This drink is very sweet!",
        "example_vi": "Đồ uống này ngọt lắm!",
        "pos": "adjective",
        "image_emoji": "🍬"
      },
      {
        "type": "word",
        "word_en": "order",
        "word_vi": "gọi / đặt (đồ ăn, thức uống)",
        "example_en": "Can I order a coffee and a cake?",
        "example_vi": "Em có thể gọi một cà phê và một bánh không?",
        "pos": "verb",
        "image_emoji": "📋"
      },
      {
        "type": "reading",
        "title_vi": "Heo và Masuri đi cà phê",
        "sentences_en": [
          "Heo and Masuri sit at a cosy café.",
          "Heo orders a coffee — not too sweet.",
          "Masuri smiles and orders tea.",
          "It is a perfect morning together."
        ],
        "sentences_vi": [
          "Heo và Masuri ngồi ở một quán cà phê nhỏ ấm cúng.",
          "Heo gọi cà phê — không quá ngọt.",
          "Masuri mỉm cười và gọi trà.",
          "Đây là một buổi sáng hoàn hảo của chúng mình."
        ],
        "vocab_highlights": ["coffee", "sweet", "order"]
      },
      {
        "type": "exercise",
        "exercise_type": "pig_says",
        "can_skip": false,
        "data": {
          "prompt_vi": "Em muốn gọi một cà phê không đường. Nói bằng tiếng Anh nha!",
          "target_en": "I would like a coffee without sugar, please.",
          "hints": { "verb": "would like", "noun": "coffee" }
        }
      },
      {
        "type": "ask_prompt",
        "suggestion_vi": "Hỏi anh: anh thích uống gì vào buổi sáng?"
      },
      {
        "type": "completion",
        "vocab_to_save": ["coffee", "sweet", "order"],
        "sticker_kind": "flower_rose"
      }
    ]'::jsonb
  where not exists (
    select 1 from public.daily_pages
    where for_user = heo_id and scheduled_for = '2026-05-20'
  );

  -- ── Day 4: Review ────────────────────────────────────────────
  insert into public.daily_pages (
    for_user, scheduled_for, topic, difficulty,
    title_vi, title_en, status, generated_by, cards
  )
  select
    heo_id, '2026-05-21', 'review', 1,
    'Em đang giỏi rồi nè!', 'You Are Doing So Well!',
    'published', 'manual',
    '[
      {
        "type": "intro",
        "title_vi": "Ôn tập nào! 🔁",
        "subtitle_vi": "Em đã học được nhiều rồi — ôn lại chút nhé 🌸",
        "pig_pose": "studying"
      },
      {
        "type": "reading",
        "title_vi": "Một ngày tuyệt vời",
        "sentences_en": [
          "Good morning! Today I feel happy and excited.",
          "I order a coffee — sweet and warm.",
          "I am calm and ready for a new day.",
          "Hello, Masuri! I miss you."
        ],
        "sentences_vi": [
          "Chào buổi sáng! Hôm nay em vui và hào hứng.",
          "Em gọi cà phê — ngọt và ấm.",
          "Em bình yên và sẵn sàng cho ngày mới.",
          "Xin chào, Masuri! Em nhớ anh."
        ],
        "vocab_highlights": ["morning", "happy", "excited", "coffee", "sweet", "calm"]
      },
      {
        "type": "exercise",
        "exercise_type": "sentence_remix",
        "can_skip": false,
        "data": {
          "base_en": "I feel happy today.",
          "base_vi": "Hôm nay em cảm thấy vui.",
          "instruction_vi": "Đổi ''happy'' thành ''excited'' và ''today'' thành ''this morning''",
          "target_en": "I feel excited this morning.",
          "hint_words": ["excited", "this", "morning"]
        }
      },
      {
        "type": "exercise",
        "exercise_type": "spot_imposter",
        "can_skip": true,
        "data": {
          "sentence_en": "I order a coffee. It taste sweet.",
          "imposter_word": "taste",
          "correct_word": "tastes",
          "hint_vi": "Chủ từ ''it'' → động từ phải chia ngôi 3 số ít nha em"
        }
      },
      {
        "type": "completion",
        "vocab_to_save": [],
        "sticker_kind": "ribbon"
      }
    ]'::jsonb
  where not exists (
    select 1 from public.daily_pages
    where for_user = heo_id and scheduled_for = '2026-05-21'
  );

  -- ── Day 5: Daily routine ─────────────────────────────────────
  insert into public.daily_pages (
    for_user, scheduled_for, topic, difficulty,
    title_vi, title_en, status, generated_by, cards
  )
  select
    heo_id, '2026-05-22', 'daily', 2,
    'Một ngày của em', 'A Day in My Life',
    'published', 'manual',
    '[
      {
        "type": "intro",
        "title_vi": "Ngày thường của em ☀️",
        "subtitle_vi": "Em kể về một ngày bình thường bằng tiếng Anh nhé!",
        "pig_pose": "neutral"
      },
      {
        "type": "word",
        "word_en": "wake up",
        "word_vi": "thức dậy",
        "example_en": "I wake up at seven every morning.",
        "example_vi": "Em thức dậy lúc bảy giờ mỗi sáng.",
        "pos": "phrase",
        "image_emoji": "⏰"
      },
      {
        "type": "word",
        "word_en": "lunch",
        "word_vi": "bữa trưa",
        "example_en": "I have lunch with my friends at noon.",
        "example_vi": "Em ăn trưa với bạn bè vào buổi trưa.",
        "pos": "noun",
        "image_emoji": "🍱"
      },
      {
        "type": "word",
        "word_en": "evening",
        "word_vi": "buổi tối / chiều tối",
        "example_en": "In the evening, I relax and read.",
        "example_vi": "Vào buổi tối, em nghỉ ngơi và đọc sách.",
        "pos": "noun",
        "image_emoji": "🌇"
      },
      {
        "type": "reading",
        "title_vi": "Ngày của em",
        "sentences_en": [
          "I wake up early in the morning.",
          "I drink coffee and feel ready for the day.",
          "At noon I have lunch — something warm and good.",
          "In the evening I feel calm and a little tired.",
          "I call Masuri before I sleep. I feel happy."
        ],
        "sentences_vi": [
          "Em thức dậy sớm vào buổi sáng.",
          "Em uống cà phê và cảm thấy sẵn sàng cho ngày mới.",
          "Vào buổi trưa em ăn trưa — thứ gì đó ấm và ngon.",
          "Vào buổi tối em cảm thấy bình yên và hơi mệt.",
          "Em gọi điện cho Masuri trước khi ngủ. Em thấy vui."
        ],
        "vocab_highlights": ["wake up", "lunch", "evening", "happy", "calm"]
      },
      {
        "type": "exercise",
        "exercise_type": "word_train",
        "can_skip": false,
        "data": {
          "target_sentence_en": "I wake up early and drink coffee every morning.",
          "shuffled_words": ["coffee", "wake", "morning.", "I", "up", "and", "early", "every", "drink"],
          "hint_vi": "Em thức dậy sớm và uống cà phê mỗi sáng."
        }
      },
      {
        "type": "ask_prompt",
        "suggestion_vi": "Hỏi anh: anh thường làm gì vào buổi tối?"
      },
      {
        "type": "completion",
        "vocab_to_save": ["wake up", "lunch", "evening"],
        "sticker_kind": "star_filled"
      }
    ]'::jsonb
  where not exists (
    select 1 from public.daily_pages
    where for_user = heo_id and scheduled_for = '2026-05-22'
  );

  -- ── Day 6: Weather ───────────────────────────────────────────
  insert into public.daily_pages (
    for_user, scheduled_for, topic, difficulty,
    title_vi, title_en, status, generated_by, cards
  )
  select
    heo_id, '2026-05-23', 'weather', 1,
    'Trời hôm nay đẹp ghê', 'The Weather Today',
    'published', 'manual',
    '[
      {
        "type": "intro",
        "title_vi": "Thời tiết hôm nay 🌤",
        "subtitle_vi": "Em học nói về thời tiết bằng tiếng Anh nha!",
        "pig_pose": "thinking"
      },
      {
        "type": "word",
        "word_en": "sunny",
        "word_vi": "nắng / trời nắng",
        "example_en": "It is sunny and warm today.",
        "example_vi": "Hôm nay trời nắng và ấm áp.",
        "pos": "adjective",
        "image_emoji": "☀️"
      },
      {
        "type": "word",
        "word_en": "rainy",
        "word_vi": "mưa / trời mưa",
        "example_en": "I love rainy days — they feel so calm.",
        "example_vi": "Em thích những ngày mưa — cảm giác bình yên lắm.",
        "pos": "adjective",
        "image_emoji": "🌧"
      },
      {
        "type": "word",
        "word_en": "cool",
        "word_vi": "mát mẻ",
        "example_en": "The evening breeze is so cool!",
        "example_vi": "Gió buổi tối mát mẻ ghê!",
        "pos": "adjective",
        "image_emoji": "💨"
      },
      {
        "type": "reading",
        "title_vi": "Nhắn cho anh",
        "sentences_en": [
          "Today is sunny and a little warm.",
          "I sit by the window with my coffee.",
          "The breeze is cool and I feel so calm.",
          "I wish you were here with me."
        ],
        "sentences_vi": [
          "Hôm nay trời nắng và hơi ấm.",
          "Em ngồi bên cửa sổ với cà phê.",
          "Gió mát mẻ và em cảm thấy rất bình yên.",
          "Ước gì anh ở đây cùng em."
        ],
        "vocab_highlights": ["sunny", "cool", "calm"]
      },
      {
        "type": "exercise",
        "exercise_type": "caption_polaroid",
        "can_skip": false,
        "data": {
          "image_emoji": "🌧☕",
          "starter_words": ["It", "rainy", "and"],
          "example_en": "It is rainy and I feel calm."
        }
      },
      {
        "type": "ask_prompt",
        "suggestion_vi": "Hỏi anh: anh thích thời tiết nào nhất?"
      },
      {
        "type": "completion",
        "vocab_to_save": ["sunny", "rainy", "cool"],
        "sticker_kind": "sparkle"
      }
    ]'::jsonb
  where not exists (
    select 1 from public.daily_pages
    where for_user = heo_id and scheduled_for = '2026-05-23'
  );

  -- ── Day 7: Together ──────────────────────────────────────────
  insert into public.daily_pages (
    for_user, scheduled_for, topic, difficulty,
    title_vi, title_en, status, generated_by, cards
  )
  select
    heo_id, '2026-05-24', 'feelings', 2,
    'Heo và Masuri', 'Heo and Masuri',
    'published', 'manual',
    '[
      {
        "type": "intro",
        "title_vi": "Heo và Masuri 🐷💕",
        "subtitle_vi": "Hôm nay em kể về anh bằng tiếng Anh nha!",
        "pig_pose": "cheering"
      },
      {
        "type": "word",
        "word_en": "miss",
        "word_vi": "nhớ",
        "example_en": "I miss you every day, Masuri.",
        "example_vi": "Em nhớ anh mỗi ngày, Masuri ơi.",
        "pos": "verb",
        "image_emoji": "💌"
      },
      {
        "type": "word",
        "word_en": "together",
        "word_vi": "cùng nhau",
        "example_en": "We are learning together, step by step.",
        "example_vi": "Chúng mình đang cùng nhau học, từng bước một.",
        "pos": "adverb",
        "image_emoji": "🤝"
      },
      {
        "type": "word",
        "word_en": "soon",
        "word_vi": "sớm thôi",
        "example_en": "I will see you soon!",
        "example_vi": "Em sẽ gặp anh sớm thôi!",
        "pos": "adverb",
        "image_emoji": "⏳"
      },
      {
        "type": "reading",
        "title_vi": "Thư gửi anh",
        "sentences_en": [
          "Dear Masuri,",
          "I miss you every morning when I wake up.",
          "I feel happy every time we talk together.",
          "You make every day better for me.",
          "I will see you soon. I love you."
        ],
        "sentences_vi": [
          "Masuri thân mến,",
          "Em nhớ anh mỗi buổi sáng khi thức dậy.",
          "Em vui mỗi khi chúng mình nói chuyện cùng nhau.",
          "Anh làm mỗi ngày của em trở nên tốt hơn.",
          "Em sẽ gặp anh sớm thôi. Em yêu anh."
        ],
        "vocab_highlights": ["miss", "together", "soon", "happy"]
      },
      {
        "type": "exercise",
        "exercise_type": "word_train",
        "can_skip": false,
        "data": {
          "target_sentence_en": "I miss you every day and I will see you soon.",
          "shuffled_words": ["you", "I", "day", "miss", "every", "soon.", "see", "will", "I", "and"],
          "hint_vi": "Em nhớ anh mỗi ngày và em sẽ gặp anh sớm thôi."
        }
      },
      {
        "type": "ask_prompt",
        "suggestion_vi": "Hỏi anh: anh có nhớ em không? 🥺"
      },
      {
        "type": "completion",
        "vocab_to_save": ["miss", "together", "soon"],
        "sticker_kind": "flower_rose"
      }
    ]'::jsonb
  where not exists (
    select 1 from public.daily_pages
    where for_user = heo_id and scheduled_for = '2026-05-24'
  );

  raise notice 'CP10 seed complete — 7 daily pages checked/inserted for Heo.';
end $$;
