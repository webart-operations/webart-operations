-- =============================================================================
-- MEETING SCHEMA ALIGNMENT FIX
-- Run this in your Supabase SQL Editor to resolve the "source_id" missing error.
-- =============================================================================

-- 1. Add source_id column to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS source_id text;

-- 2. Add a unique constraint to source_id to prevent duplicates from external tools
-- First, ensure there are no duplicate nulls if you already have data (source_id is optional but unique when present)
-- We use a unique index for this.
CREATE UNIQUE INDEX IF NOT EXISTS meetings_source_id_idx ON meetings (source_id) WHERE source_id IS NOT NULL;

-- 3. Ensure other columns used by the Edge Function exist
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link text;

-- =============================================================================
-- REFRESH POSTGREST CACHE
-- =============================================================================
NOTIFY pgrst, 'reload schema';
