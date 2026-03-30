-- Buat tabel notes untuk halaman Catatan
-- Jalankan SQL ini di Supabase SQL Editor: https://supabase.com/dashboard/project/mqqdlxhhzhoidzkiyzsh/sql/new

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Catatan Baru',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Beri akses publik (sesuaikan dengan kebijakan RLS Anda)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to notes" ON public.notes
  FOR ALL
  USING (true)
  WITH CHECK (true);
