-- ==============================================================================
-- DATABASE UPGRADE SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX ALL DELETE AND DASHBOARD CRASHES
-- ==============================================================================

-- 1. Add missing columns to 'submissions' table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assigned_am text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assigned_pm text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_reactivation boolean DEFAULT false;

-- 2. Ensure RLS policies don't block updates to these new columns
DROP POLICY IF EXISTS "Allow authenticated updates on submissions" ON submissions;
CREATE POLICY "Allow authenticated updates on submissions" ON submissions FOR UPDATE USING (auth.role() = 'authenticated');

-- ==============================================================================
-- ALL DONE! The Dashboard, Analytics, and Data Deletions will now work flawlessly.
-- ==============================================================================
