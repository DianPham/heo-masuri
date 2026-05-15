-- ============================================================
-- Heo & Masuri — Phase 1.5 Notebook schema
-- Safe to run even if some tables already exist (IF NOT EXISTS).
-- Run in the Supabase SQL editor (Singapore region).
-- ============================================================

-- ── daily_pages ──────────────────────────────────────────────
-- One page per calendar day (Asia/Ho_Chi_Minh). Masuri writes
-- these; Heo reads them as a story-card sequence.
create table if not exists public.daily_pages (
  id             uuid primary key default gen_random_uuid(),
  date           date unique not null,               -- YYYY-MM-DD in VN time
  topic          text not null,                      -- e.g. "greeting", "feelings"
  title_vi       text not null,
  title_en       text,
  cards          jsonb not null default '[]'::jsonb, -- ordered Card[] array
  published      boolean not null default false,
  published_at   timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists daily_pages_date_idx on public.daily_pages (date desc);

-- ── vocabulary ───────────────────────────────────────────────
-- Words Heo saves while reading daily pages (or from Masuri cards).
create table if not exists public.vocabulary (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id),
  word_en             text not null,
  word_vi             text not null,
  pos                 text,                           -- part of speech: noun/verb/adj/adv/phrase
  example_en          text,
  example_vi          text,
  source_page_id      uuid references public.daily_pages(id) on delete set null,
  source_page_topic   text,
  source_page_title_vi text,
  source_kind         text not null default 'daily_page'
                        check (source_kind in ('daily_page', 'masuri_card', 'manual')),
  self_confidence     smallint not null default 0
                        check (self_confidence in (-1, 0, 1)),
  review_count        integer not null default 0,
  last_reviewed_at    timestamptz,
  saved_at            timestamptz default now(),
  constraint vocabulary_user_word_unique unique (user_id, word_en)
);
create index if not exists vocabulary_user_saved_idx
  on public.vocabulary (user_id, saved_at desc);
create index if not exists vocabulary_user_confidence_idx
  on public.vocabulary (user_id, self_confidence, last_reviewed_at);

-- ── ask_masuri_threads ───────────────────────────────────────
-- Questions Heo sends to Masuri from TappableText or VocabWordSheet.
create table if not exists public.ask_masuri_threads (
  id              uuid primary key default gen_random_uuid(),
  from_user_id    uuid not null references public.users(id),
  word_en         text,
  question_text   text not null,
  source_page_id  uuid references public.daily_pages(id) on delete set null,
  reply_text      text,
  replied_at      timestamptz,
  seen_at         timestamptz,
  created_at      timestamptz default now()
);
create index if not exists ask_masuri_from_user_idx
  on public.ask_masuri_threads (from_user_id, created_at desc);
create index if not exists ask_masuri_unseen_idx
  on public.ask_masuri_threads (from_user_id, seen_at)
  where seen_at is null;

-- ── letters ──────────────────────────────────────────────────
-- Love letters between Heo and Masuri (CP7).
create table if not exists public.letters (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id),
  to_user_id   uuid not null references public.users(id),
  subject      text,
  body_vi      text not null,
  body_en      text,
  prompt_id    uuid,                                  -- FK added below after letter_prompts
  seen_at      timestamptz,
  sent_at      timestamptz default now()
);
create index if not exists letters_to_user_idx
  on public.letters (to_user_id, sent_at desc);

-- ── letter_prompts ───────────────────────────────────────────
-- Writing prompts that inspire letters (seeded by Masuri / admin).
create table if not exists public.letter_prompts (
  id         uuid primary key default gen_random_uuid(),
  prompt_vi  text not null,
  prompt_en  text,
  category   text,
  active     boolean not null default true,
  created_at timestamptz default now()
);

-- Add the FK now that letter_prompts exists
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'letters_prompt_id_fkey'
      and table_name = 'letters'
  ) then
    alter table public.letters
      add constraint letters_prompt_id_fkey
      foreign key (prompt_id) references public.letter_prompts(id) on delete set null;
  end if;
end $$;

-- ── streaks ──────────────────────────────────────────────────
-- One row per user. current_streak / longest_streak in days.
create table if not exists public.streaks (
  user_id        uuid primary key references public.users(id),
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,                             -- VN local date of last completed page
  updated_at     timestamptz default now()
);

-- ── notebook_prefs ───────────────────────────────────────────
-- Per-user notebook settings (TTS speed, reminder time, etc).
create table if not exists public.notebook_prefs (
  user_id          uuid primary key references public.users(id),
  tts_rate         numeric not null default 0.9 check (tts_rate between 0.5 and 2.0),
  reminder_enabled boolean not null default false,
  reminder_time    time,                             -- local time for daily reminder
  updated_at       timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.daily_pages         enable row level security;
alter table public.vocabulary          enable row level security;
alter table public.ask_masuri_threads  enable row level security;
alter table public.letters             enable row level security;
alter table public.letter_prompts      enable row level security;
alter table public.streaks             enable row level security;
alter table public.notebook_prefs      enable row level security;

-- daily_pages: anyone can read published pages; no anon writes
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read published daily_pages' and tablename = 'daily_pages') then
    create policy "anon read published daily_pages"
      on public.daily_pages for select to anon
      using (published = true);
  end if;
end $$;

-- vocabulary: anon reads/writes own rows (user_id matched by cookie-based API)
-- (All writes go through service_role API routes — anon policy is belt-and-suspenders)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read vocabulary' and tablename = 'vocabulary') then
    create policy "anon read vocabulary"
      on public.vocabulary for select to anon using (true);
  end if;
end $$;

-- ask_masuri_threads: anon read own threads
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read ask_masuri_threads' and tablename = 'ask_masuri_threads') then
    create policy "anon read ask_masuri_threads"
      on public.ask_masuri_threads for select to anon using (true);
  end if;
end $$;

-- letters: anon read (both parties)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read letters' and tablename = 'letters') then
    create policy "anon read letters"
      on public.letters for select to anon using (true);
  end if;
end $$;

-- letter_prompts: anon read active
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read letter_prompts' and tablename = 'letter_prompts') then
    create policy "anon read letter_prompts"
      on public.letter_prompts for select to anon
      using (active = true);
  end if;
end $$;

-- streaks: anon read
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read streaks' and tablename = 'streaks') then
    create policy "anon read streaks"
      on public.streaks for select to anon using (true);
  end if;
end $$;

-- notebook_prefs: no anon read (private settings)

-- ============================================================
-- Grants to anon role
-- ============================================================

grant select on public.daily_pages        to anon;
grant select on public.vocabulary         to anon;
grant select on public.ask_masuri_threads to anon;
grant select on public.letters            to anon;
grant select on public.letter_prompts     to anon;
grant select on public.streaks            to anon;
-- notebook_prefs: no grant to anon

-- ============================================================
-- Seed: initialize streak rows for existing users
-- ============================================================

insert into public.streaks (user_id, current_streak, longest_streak)
select id, 0, 0 from public.users
on conflict (user_id) do nothing;

insert into public.notebook_prefs (user_id)
select id from public.users
on conflict (user_id) do nothing;
