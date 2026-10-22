-- ============================================================
-- Heo & Masuri — storage bucket for cached pronunciation audio
-- /api/tts synthesizes a phrase once (Google Cloud TTS) and caches the MP3
-- here at tts/<lang>/<voice>/<sha256(text)>.mp3. Private: only the server
-- (service role) reads and writes it; the app streams audio via /api/tts.
-- Safe to run multiple times.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('tts', 'tts', false)
on conflict (id) do nothing;
