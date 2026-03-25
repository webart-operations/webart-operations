-- =============================================================================
-- REVENUE HARDENING FIX
-- Run this in your Supabase SQL Editor to support reactivation tracking in Revenue.
-- =============================================================================

-- 1. Add is_reactivation column to revenue_ledger and projects
ALTER TABLE revenue_ledger ADD COLUMN IF NOT EXISTS is_reactivation boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_reactivation boolean DEFAULT false;

-- 2. Backfill existing data
-- Part A: Update projects from submissions
UPDATE projects p
SET is_reactivation = true
FROM submissions s
WHERE s.client_name = p.client_name AND s.product = p.product AND s.is_reactivation = true;

-- Part B: Update revenue_ledger from projects
UPDATE revenue_ledger l
SET is_reactivation = true
FROM projects p
WHERE l.project_id = p.id AND p.is_reactivation = true;


-- 3. Update the payment_ledger view if it exists
-- (Assuming it's a simple view of revenue_ledger)
-- If it's a materialized view, it needs REFRESH. If it's a standard view, it might need recreation.
-- DROP VIEW IF EXISTS payment_ledger; 
-- CREATE VIEW payment_ledger AS SELECT * FROM revenue_ledger;

-- =============================================================================
-- REFRESH POSTGREST CACHE
-- =============================================================================
NOTIFY pgrst, 'reload schema';
