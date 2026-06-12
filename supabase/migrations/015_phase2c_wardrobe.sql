-- Phase 2C / CP8 — wardrobe_items + outfit_suggestions + storage bucket.
-- Blueprint §4.3, §7.3.

create table public.wardrobe_items (
  id              uuid primary key default gen_random_uuid(),
  owner           uuid not null references public.users(id),
  photo_url       text not null,
  thumbnail_url   text,
  label           text,
  tags            text[] not null default '{}',
  added_at        timestamptz default now(),
  archived        boolean not null default false,
  wear_count      int not null default 0,
  last_worn_at    timestamptz
);
create index wardrobe_browse_idx on public.wardrobe_items (owner, archived, added_at desc);

alter table public.wardrobe_items enable row level security;
create policy "anon read non-archived wardrobe" on public.wardrobe_items
  for select to anon using (archived = false);

-- outfit_suggestions. date_id will reference scheduled_dates(id) once CP10
-- lands; left as plain uuid (nullable) for now so this migration ships.
create table public.outfit_suggestions (
  id              uuid primary key default gen_random_uuid(),
  date_id         uuid,
  suggester       uuid not null references public.users(id),
  target_user     uuid not null references public.users(id),
  wardrobe_item   uuid not null references public.wardrobe_items(id),
  note            text,
  status          text not null default 'pending'
                    check (status in ('pending','accepted','counter','declined')),
  counter_item    uuid references public.wardrobe_items(id),
  responded_at    timestamptz,
  created_at      timestamptz default now()
);
create index outfit_suggestions_target_idx on public.outfit_suggestions (target_user, status, created_at desc);

alter table public.outfit_suggestions enable row level security;
create policy "anon read suggestions" on public.outfit_suggestions
  for select to anon using (true);

-- Storage bucket — private; reads via signed URL only; writes service-role.
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do nothing;
