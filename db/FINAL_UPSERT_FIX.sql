-- =============================================================================
-- FINAL UPSERT & CONSTRAINT FIX
-- Run this in your Supabase SQL Editor to resolve the "ON CONFLICT" error.
-- =============================================================================

-- 1. Fix MEETINGS table
-- First, remove any partial indexes that might conflict
DROP INDEX IF EXISTS meetings_source_id_idx;

-- Add a formal UNIQUE CONSTRAINT on source_id
-- Note: This will fail if you already have duplicate source_ids in your data.
-- If so, you must delete duplicates first.
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_source_id_key;
ALTER TABLE meetings ADD CONSTRAINT meetings_source_id_key UNIQUE (source_id);

-- 2. Fix APP_SETTINGS table
-- Ensure 'key' is unique so .upsert() works in Form Config
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_key_key;
ALTER TABLE app_settings ADD CONSTRAINT app_settings_key_key UNIQUE (key);

-- 3. Ensure columns exist for all recently added features
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link text;

-- =============================================================================
-- REFRESH POSTGREST CACHE
-- =============================================================================
NOTIFY pgrst, 'reload schema';
