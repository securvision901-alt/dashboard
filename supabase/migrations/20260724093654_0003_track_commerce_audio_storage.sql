/*
# Track & Release Commerce Attributes + Audio Storage

## What This Migration Does

Adds the music-commerce infrastructure that was missing: per-track pricing,
free/preview/download permissions, preview-length control, and a Supabase
Storage bucket for audio file uploads (WAV, MP3, FLAC).

## New Columns on `tracks`

- `audio_storage_path` (text) — path in the `audio` storage bucket (e.g. `releases/<release_id>/track_<id>.mp3`)
- `preview_seconds` (integer, default 30) — how many seconds of the track can be played as a free preview
- `is_preview_enabled` (boolean, default true) — whether the 30-sec preview is available to non-buyers
- `is_free` (boolean, default false) — if true, the full track is free to stream and download
- `download_allowed` (boolean, default true) — whether buyers can download the audio file
- `price_cents` (integer, default 0) — per-track purchase price in cents (0 = free)
- `duration_seconds` already exists — will be populated from uploaded audio metadata

## New Columns on `releases`

- `price_cents` (integer, default 0) — full-release purchase price in cents (0 = free)
- `is_free` (boolean, default false) — if true, the entire release is free to stream and download
- `genre` (text) — genre tag for filtering
- `explicit` (boolean, default false) — explicit content flag

## Storage

- Creates a public-readable storage bucket named `audio` for audio files.
- Files are readable by anyone (public bucket) so the portal can stream previews.
- Writes (uploads) are allowed for anon + authenticated (admin portal uses anon key).

## Security

- RLS already enabled on `tracks` and `releases` — no changes needed.
- Storage bucket is public-readable, writeable by anon/authenticated.
*/
