-- =============================================================================
-- PHASE 16 SCHEMA ENHANCEMENTS
-- =============================================================================

-- 1. Add 'closer' tracking to Submissions and Projects
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS closer text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS closer text;

-- 2. Add 'usd_net' for normalized financial reporting
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS usd_net numeric(12,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS usd_net numeric(12,2) DEFAULT 0;

-- 2. Add 'delivered' status count helper or ensures existing status is used
-- (Projects can already have 'completed' or 'delivered' mapping)

-- 3. Ensure all Net/Gross columns are consistent
-- Some older rows might have null values; set them to 0 for better aggregate stats.
UPDATE submissions SET net = 0 WHERE net IS NULL;
UPDATE submissions SET gross = 0 WHERE gross IS NULL;
UPDATE projects SET net = 0 WHERE net IS NULL;
UPDATE projects SET gross = 0 WHERE gross IS NULL;

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- REFRESH COMPLETE
-- =============================================================================
