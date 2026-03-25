-- Allow anyone (even unauthenticated users) to insert submissions
-- This is required for the public sales form at /#sales

CREATE POLICY "Allow anon to insert submissions" 
ON public.submissions 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Ensure the anon role has usage on the schema if not already set (standard in Supabase)
-- GRANT USAGE ON SCHEMA public TO anon;
-- GRANT INSERT ON public.submissions TO anon;
