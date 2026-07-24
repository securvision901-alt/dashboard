/*
# Track & Release Commerce Attributes — Column Additions

Adds per-track pricing, free/preview/download permissions, preview-length
control, and release-level commerce fields. Also creates a public-readable
Supabase Storage bucket for audio file uploads.

## New Columns on `tracks`
- `audio_storage_path` (text) — path in the `audio` storage bucket
- `preview_seconds` (integer, default 30) — how many seconds of free preview
- `is_preview_enabled` (boolean, default true) — whether preview is available
- `is_free` (boolean, default false) — full track is free to stream and download
- `download_allowed` (boolean, default true) — buyers can download the file
- `price_cents` (integer, default 0) — per-track purchase price in cents

## New Columns on `releases`
- `price_cents` (integer, default 0) — full-release purchase price in cents
- `is_free` (boolean, default false) — entire release is free
- `genre` (text) — genre tag
- `explicit` (boolean, default false) — explicit content flag

## Storage
- Creates public-readable `audio` bucket for WAV/MP3/FLAC uploads
*/

-- ============================================================
-- TRACK COLUMNS
-- ============================================================

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audio_storage_path text;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS preview_seconds integer NOT NULL DEFAULT 30;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_preview_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS download_allowed boolean NOT NULL DEFAULT true;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0;

-- ============================================================
-- RELEASE COLUMNS
-- ============================================================

ALTER TABLE releases ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS genre text;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS explicit boolean NOT NULL DEFAULT false;

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, anon+authenticated write
DROP POLICY IF EXISTS "audio_bucket_read" ON storage.objects;
CREATE POLICY "audio_bucket_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'audio');

DROP POLICY IF EXISTS "audio_bucket_insert" ON storage.objects;
CREATE POLICY "audio_bucket_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'audio');

DROP POLICY IF EXISTS "audio_bucket_update" ON storage.objects;
CREATE POLICY "audio_bucket_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'audio') WITH CHECK (bucket_id = 'audio');

DROP POLICY IF EXISTS "audio_bucket_delete" ON storage.objects;
CREATE POLICY "audio_bucket_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'audio');
