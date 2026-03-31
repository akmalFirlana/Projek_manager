-- Jalankan script ini di Supabase SQL Editor
-- Dashboard Supabase -> SQL Editor -> New Query -> Paste & Run

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS label text;
