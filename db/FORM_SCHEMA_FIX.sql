-- =============================================================================
-- FORM SCHEMA FIX
-- Run this in your Supabase SQL Editor to fix all form submission errors.
-- This adds every missing column that the forms are trying to write to.
-- =============================================================================

-- Add missing columns to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS usd_gross numeric(12,2) DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS payment_term text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS address text;

-- Ensure sales_remarks column exists (in case it was never created)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sales_remarks text;

-- Ensure submitted_by (text) is present (the app uses name, not ID)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submitted_by text;

-- =============================================================================
-- DONE! Now go back to the platform and try submitting the Sales Form again.
-- =============================================================================
