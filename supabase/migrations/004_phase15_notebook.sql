-- ============================================================
-- Heo & Masuri — Phase 1.5 Notebook schema
-- Blueprint §3 — run in the Supabase SQL editor (Singapore).
-- Safe to run even if some tables already exist (IF NOT EXISTS).
--
-- NOTE: This file reflects the actual production schema and
-- blueprint §3 spec. The earlier draft of this file had stale
-- column names (from_user_id, body_vi, etc.) — those were wrong.
-- This version is authoritative. Run 006_phase15_schema_fixes.sql
-- afterward to patch any deviations on existing databases.
-- ============================================================

-- ── daily_pages ──────────────────────────────────────────────
-- One page per calendar day per user. Status lifecycle:
--   draft → approved → published → (completed_at set)
create table if not exists public.daily_pages (
  id              uuid primary key default gen_random_uuid(),
  for_user        uuid not null references public.users(id),
  scheduled_for   date not null,
  status          text not null default 'draft'
                    check (status in ('draft','approved','published','archived')),
  title_vi        text not null,
  title_en        text not null,
  topic           text not null,
  difficulty      smallint not null check (difficulty between 1 and 5),
  cards           jsonb not null default '[]'::jsonb,
  generated_by    text not null default 'routine'
                    check (generated_by in ('routine','manual','masuri')),
  generation_meta jsonb,
  approved_by     uuid references public.users(id),
  approved_at     timestamptz,
  published_at    timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz default now()
);
create unique index if not exists daily_pages_user_date_uidx
  on public.daily_pages (for_user, scheduled_for)
  where status != 'archived';
create index if not exists daily_pages_user_status_idx
  on public.daily_pages (for_user, status, scheduled_for desc);

-- ── vocabulary ───────────────────────────────────────────────
-- Heo's permanent vocabulary book.
create table if not exists public.vocabulary (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id),
  word_en              text not null,
  word_vi              text not null,
  example_en           text,
  example_vi           text,
  pos                  text,
  source_page_id       uuid references public.daily_pages(id) on delete set null,
  source_kind          text not null default 'page'
                         check (source_kind in ('page','masuri_card','ask_masuri','letter')),
  saved_at             timestamptz default now(),
  last_reviewed_at     timestamptz,
  review_count         int not null default 0,
  self_confidence      smallint not null default 0
                         check (self_confidence between -1 and 1),
  constraint vocabulary_user_word_unique unique (user_id, word_en)
);
create index if not exists vocabulary_user_saved_idx
  on public.vocabulary (user_id, saved_at desc);
create index if not exists vocabulary_user_confidence_idx
  on public.vocabulary (user_id, self_confidence, last_reviewed_at);

-- ── ask_masuri_threads ───────────────────────────────────────
-- Heo long-presses a word → "hỏi Masuri" → creates a thread.
-- NOTE: column names follow blueprint (from_user / to_user, not from_user_id).
create table if not exists public.ask_masuri_threads (
  id              uuid primary key default gen_random_uuid(),
  from_user       uuid not null references public.users(id),
  to_user         uuid not null references public.users(id),
  context_word    text,
  context_source  jsonb,
  question_note   text,
  reply_text      text,
  reply_audio_url text,
  replied_at      timestamptz,
  seen_at         timestamptz,
  created_at      timestamptz default now()
);
create index if not exists ask_masuri_from_user_idx
  on public.ask_masuri_threads (from_user, created_at desc);
create index if not exists ask_masuri_to_user_unseen_idx
  on public.ask_masuri_threads (to_user, replied_at, created_at desc);

-- ── letters ──────────────────────────────────────────────────
-- Two-way note threads. Phase 2 will extend this with scheduled delivery.
-- kind: weekly_letter | vocab_card | encouragement
-- NOTE: two_truths implemented as kind='weekly_letter' + attachments per blueprint.
--   (Current app has kind='two_truths' — see migration 006 notes.)
create table if not exists public.letters (
  id              uuid primary key default gen_random_uuid(),
  from_user       uuid not null references public.users(id),
  to_user         uuid not null references public.users(id),
  kind            text not null
                    check (kind in ('weekly_letter','vocab_card','encouragement','two_truths')),
  prompt_id       text,
  body            text not null,
  language        text not null default 'en'
                    check (language in ('vi','en','mixed')),
  attachments     jsonb,
  in_reply_to     uuid references public.letters(id),
  scheduled_for   timestamptz default now(),
  delivered_at    timestamptz default now(),
  seen_at         timestamptz,
  created_at      timestamptz default now()
);
create index if not exists letters_to_user_idx
  on public.letters (to_user, seen_at, delivered_at desc);
create index if not exists letters_from_user_kind_idx
  on public.letters (from_user, kind, created_at desc);

-- ── letter_prompts ───────────────────────────────────────────
-- Blueprint uses text primary key ('week_001_three_things').
-- Current app uses uuid — keeping uuid for back-compat; id column stable.
create table if not exists public.letter_prompts (
  id            uuid primary key default gen_random_uuid(),
  prompt_vi     text not null,
  prompt_en     text not null,
  starter_words jsonb,
  difficulty    smallint not null default 2 check (difficulty between 1 and 5),
  active        boolean not null default true,
  created_at    timestamptz default now()
);

-- ── streaks ──────────────────────────────────────────────────
-- One row per user.
create table if not exists public.streaks (
  user_id              uuid primary key references public.users(id),
  current_streak       int not null default 0,
  longest_streak       int not null default 0,  -- blueprint calls this best_streak; same semantics
  last_active_date     date,                     -- blueprint: last_activity_date; same semantics
  rest_days_remaining  int not null default 1,
  rest_days_used_at    date[] not null default '{}',
  rest_replenished_at  timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── notebook_prefs ───────────────────────────────────────────
-- Per-user notebook settings.
create table if not exists public.notebook_prefs (
  user_id                uuid primary key references public.users(id),
  daily_reminder_time    time not null default '20:00',
  daily_reminder_enabled boolean not null default true,
  ask_masuri_enabled     boolean not null default true,
  letter_reply_enabled   boolean not null default true,
  preferred_topics       text[] not null default array['daily','feelings','food'],
  tts_rate               numeric not null default 0.9 check (tts_rate between 0.5 and 2.0),
  updated_at             timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.daily_pages        enable row level security;
alter table public.vocabulary         enable row level security;
alter table public.ask_masuri_threads enable row level security;
alter table public.letters            enable row level security;
alter table public.letter_prompts     enable row level security;
alter table public.streaks            enable row level security;
alter table public.notebook_prefs     enable row level security;

-- daily_pages: anon can read published pages only
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read published pages' and tablename = 'daily_pages') then
    create policy "anon read published pages"
      on public.daily_pages for select to anon
      using (status = 'published');
  end if;
end $$;

-- vocabulary: anon read OK
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read vocabulary' and tablename = 'vocabulary') then
    create policy "anon read vocabulary"
      on public.vocabulary for select to anon using (true);
  end if;
end $$;

-- ask_masuri_threads: anon read OK (only 2 users, not sensitive)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read ask threads' and tablename = 'ask_masuri_threads') then
    create policy "anon read ask threads"
      on public.ask_masuri_threads for select to anon using (true);
  end if;
end $$;

-- letters: anon read delivered letters only (blueprint §3)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read delivered letters' and tablename = 'letters') then
    create policy "anon read delivered letters"
      on public.letters for select to anon
      using (delivered_at is not null and delivered_at <= now());
  end if;
end $$;

-- letter_prompts: anon read active prompts
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

-- notebook_prefs: server-only — no anon policy

-- ============================================================
-- Grants to anon role
-- ============================================================

grant select on public.daily_pages        to anon;
grant select on public.vocabulary         to anon;
grant select on public.ask_masuri_threads to anon;
grant select on public.letters            to anon;
grant select on public.letter_prompts     to anon;
grant select on public.streaks            to anon;
-- notebook_prefs: no anon grant

-- ============================================================
-- Bootstrap: initial rows for existing users
-- ============================================================

insert into public.streaks (user_id, current_streak, longest_streak)
select id, 0, 0 from public.users
on conflict (user_id) do nothing;

insert into public.notebook_prefs (user_id)
select id from public.users
on conflict (user_id) do nothing;
