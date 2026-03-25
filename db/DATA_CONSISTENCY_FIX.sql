-- =============================================================================
-- DATA CONSISTENCY & INTEGRITY FIXES
-- This script hardens the data to ensure reports match perfectly.
-- =============================================================================

-- 1. UNIFY REVENUE COLUMNS
-- Ensure amount_usd is always populated if amount_paid exists (for legacy rows)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='revenue_ledger' AND column_name='amount_paid') THEN
        UPDATE revenue_ledger SET amount_usd = amount_paid WHERE amount_usd IS NULL OR amount_usd = 0;
    END IF;
END $$;

-- 2. HARDEN SUBMISSION -> PROJECT LINKS
-- If a submission is 'passed' but has no project_id, try to find a matching project.
UPDATE submissions s
SET project_id = p.id
FROM projects p
WHERE s.status = 'passed' AND s.project_id IS NULL AND p.submission_id = s.id;

-- 3. FIX REVENUE ATTRIBUTION
-- Ensure revenue_ledger rows are linked to the correct client_id from their project
UPDATE revenue_ledger r
SET client_name = p.client_name
FROM projects p
WHERE r.project_id = p.id AND (r.client_name IS NULL OR r.client_name = '');

-- 4. CLEANUP GHOST AUDITS
-- Find any submissions that are passed/failed but missing a record in qa_audits
-- (This helps identify manual status changes that bypassed QA workflow)
-- SELECT * FROM submissions WHERE status IN ('passed', 'failed') AND id NOT IN (SELECT submission_id FROM qa_audits);

-- 5. REFRESH VIEWS
-- Ensure your aggregate views are up to date
NOTIFY pgrst, 'reload schema';
