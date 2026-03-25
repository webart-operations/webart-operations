-- 20240326_harden_submission_logic.sql
-- Root Cause Fix: Prevent Duplicate Projects & Improve Attribution

-- 1. HARDEN PROJECTS TABLE
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.submissions(id);

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_submission_project') THEN
        ALTER TABLE public.projects ADD CONSTRAINT unique_submission_project UNIQUE (submission_id);
    END IF;
END $$;

-- 2. HARDEN REVENUE LEDGER
-- Ensure onboarding revenue is always marked as such
ALTER TABLE public.revenue_ledger ADD COLUMN IF NOT EXISTS is_onboarding boolean DEFAULT false;

-- 3. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
