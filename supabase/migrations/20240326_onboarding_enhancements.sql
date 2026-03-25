-- Migration: Onboarding Enhancements and Schema Alignment
-- Date: 2026-03-26

-- 1. Update Submissions table
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS is_onboarding boolean DEFAULT false;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS collected_by text;

-- 2. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
