-- Phase 2C / CP7 — date_ideas (blueprint §4.3, §7.1).

create table public.date_ideas (
  id              uuid primary key default gen_random_uuid(),
  added_by        uuid not null references public.users(id),
  url             text,
  title           text,
  description     text,
  notes           text,
  tags            text[] not null default '{}',
  slot_type       text check (slot_type in ('eat','drink','activity','walk','movie','drive','home','other')),
  thumbnail_url   text,
  archived        boolean not null default false,
  used_count      int not null default 0,
  last_used_at    timestamptz,
  created_at      timestamptz default now()
);
create index date_ideas_browse_idx on public.date_ideas (archived, slot_type, created_at desc);
create index date_ideas_added_by_idx on public.date_ideas (added_by, created_at desc);

alter table public.date_ideas enable row level security;
create policy "anon read ideas" on public.date_ideas
  for select to anon using (archived = false);
-- writes service-role only
