-- =============================================================================
-- MASTER SCHEMA ALIGNMENT FIX
-- Run this in your Supabase SQL Editor to resolve all remaining form errors.
-- =============================================================================

-- 1. Fix REVENUE_LEDGER (Adding critical missing tracking columns)
ALTER TABLE revenue_ledger ADD COLUMN IF NOT EXISTS payment_type text;
ALTER TABLE revenue_ledger ADD COLUMN IF NOT EXISTS product text;
ALTER TABLE revenue_ledger ADD COLUMN IF NOT EXISTS installment text;
ALTER TABLE revenue_ledger ADD COLUMN IF NOT EXISTS paid_through text;

-- 2. Fix SUBMISSIONS (Ensuring all variants exist to prevent schema cache errors)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS usd_gross numeric(12,2) DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS payment_term text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS terms text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sales_remarks text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submitted_by text;

-- 3. Fix PROJECTS (Ensuring consistent naming with submissions)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gross numeric(12,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS net numeric(12,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sales_remarks text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS terms text;

-- =============================================================================
-- REFRESH POSTGREST CACHE
-- Sometimes Supabase needs a nudge to see new columns immediately.
-- =============================================================================
NOTIFY pgrst, 'reload schema';
