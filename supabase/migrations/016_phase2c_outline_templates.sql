-- Phase 2C / CP9 — date_outline_templates + 8 seeded starter templates.
-- Blueprint §4.3.

create table public.date_outline_templates (
  id              uuid primary key default gen_random_uuid(),
  label_vi        text not null,
  label_en        text not null,
  description_vi  text,
  description_en  text,
  slots           jsonb not null,
  sort_order      int not null default 100,
  is_system       boolean not null default false,
  archived        boolean not null default false,
  created_at      timestamptz default now()
);

alter table public.date_outline_templates enable row level security;
create policy "anon read templates" on public.date_outline_templates
  for select to anon using (archived = false);

insert into public.date_outline_templates (label_vi, label_en, description_vi, description_en, slots, sort_order, is_system) values
('Gặp nhanh', 'Quick meet', 'Cà phê + đi dạo', 'Coffee and a walk',
 '[{"type":"drink","label_vi":"Cà phê","label_en":"Coffee"},{"type":"walk","label_vi":"Đi dạo","label_en":"Walk"},{"type":"home","label_vi":"Về nhà","label_en":"Home"}]'::jsonb, 10, true),
('Ăn sáng cùng nhau', 'Breakfast date', '3-4 tiếng buổi sáng', '3-4 hours, morning',
 '[{"type":"eat","label_vi":"Ăn sáng","label_en":"Breakfast"},{"type":"drink","label_vi":"Cà phê","label_en":"Coffee"},{"type":"drive","label_vi":"Đi dạo bằng xe","label_en":"Drive"},{"type":"home","label_vi":"Về nhà","label_en":"Home"}]'::jsonb, 20, true),
('Đi ăn tối', 'Dining out', '3-5 tiếng', '3-5 hours',
 '[{"type":"eat","label_vi":"Ăn tối","label_en":"Dinner"},{"type":"activity","label_vi":"Hoạt động","label_en":"Activity"},{"type":"drive","label_vi":"Lái xe","label_en":"Drive"},{"type":"home","label_vi":"Về nhà","label_en":"Home"}]'::jsonb, 30, true),
('Xem phim', 'Movie date', 'Phim + ăn nhẹ', 'Film and a snack',
 '[{"type":"movie","label_vi":"Phim","label_en":"Movie"},{"type":"eat","label_vi":"Ăn","label_en":"Eat"},{"type":"walk","label_vi":"Đi dạo","label_en":"Walk"},{"type":"home","label_vi":"Về nhà","label_en":"Home"}]'::jsonb, 40, true),
('Cả ngày bên nhau', 'Free day', '8 tiếng trở lên', '8+ hours',
 '[{"type":"drink","label_vi":"Cà phê sáng","label_en":"Morning coffee"},{"type":"activity","label_vi":"Hoạt động","label_en":"Activity"},{"type":"eat","label_vi":"Ăn trưa","label_en":"Lunch"},{"type":"activity","label_vi":"Hoạt động","label_en":"Activity"},{"type":"eat","label_vi":"Ăn tối","label_en":"Dinner"},{"type":"drive","label_vi":"Lái xe","label_en":"Drive"},{"type":"home","label_vi":"Về nhà","label_en":"Home"}]'::jsonb, 50, true),
('Đêm khuya', 'Late night', 'Tối khuya', 'Evening only',
 '[{"type":"eat","label_vi":"Ăn tối","label_en":"Late dinner"},{"type":"drink","label_vi":"Uống","label_en":"Drink"},{"type":"walk","label_vi":"Đi dạo","label_en":"Walk"},{"type":"home","label_vi":"Về nhà","label_en":"Home"}]'::jsonb, 60, true),
('Ở nhà với nhau', 'At home', 'Nấu ăn + xem phim', 'Cook and watch a movie',
 '[{"type":"activity","label_vi":"Nấu ăn cùng nhau","label_en":"Cook together"},{"type":"movie","label_vi":"Xem phim","label_en":"Movie"},{"type":"activity","label_vi":"Ôm nhau","label_en":"Cuddle"}]'::jsonb, 70, true),
('Trống', 'Blank', 'Tự dựng', 'Build from scratch', '[]'::jsonb, 100, true);
