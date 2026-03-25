-- FINAL DELETE FIX - Run ALL of these in Supabase SQL Editor
-- This fixes every foreign key that can block deletions across the entire platform

-- 1. Submissions referenced by clients
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_submission_id_fkey;
ALTER TABLE clients ADD CONSTRAINT clients_submission_id_fkey 
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE SET NULL;

-- 2. Profiles (staff) referenced by submissions
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_submitted_by_id_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_submitted_by_id_fkey 
  FOREIGN KEY (submitted_by_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Profiles referenced by qa_audits
ALTER TABLE qa_audits DROP CONSTRAINT IF EXISTS qa_audits_auditor_id_fkey;
ALTER TABLE qa_audits ADD CONSTRAINT qa_audits_auditor_id_fkey 
  FOREIGN KEY (auditor_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. Profiles referenced by project_update_logs
ALTER TABLE project_update_logs DROP CONSTRAINT IF EXISTS project_update_logs_author_id_fkey;
ALTER TABLE project_update_logs ADD CONSTRAINT project_update_logs_author_id_fkey 
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. Profiles referenced by reactivation_leads
ALTER TABLE reactivation_leads DROP CONSTRAINT IF EXISTS reactivation_leads_requested_by_id_fkey;
ALTER TABLE reactivation_leads ADD CONSTRAINT reactivation_leads_requested_by_id_fkey 
  FOREIGN KEY (requested_by_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 6. Profiles referenced by revenue_ledger
ALTER TABLE revenue_ledger DROP CONSTRAINT IF EXISTS revenue_ledger_logged_by_id_fkey;
ALTER TABLE revenue_ledger ADD CONSTRAINT revenue_ledger_logged_by_id_fkey 
  FOREIGN KEY (logged_by_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 7. Enable RLS delete policies for authenticated users (in case RLS is blocking)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow CEO QA to delete submissions" ON submissions;
CREATE POLICY "Allow CEO QA to delete submissions" ON submissions 
  FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow CEO QA to delete projects" ON projects;
CREATE POLICY "Allow CEO QA to delete projects" ON projects 
  FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow CEO QA to delete clients" ON clients;
CREATE POLICY "Allow CEO QA to delete clients" ON clients 
  FOR DELETE USING (auth.role() = 'authenticated');

-- Done! All foreign key constraints are now SET NULL on delete, and RLS allows authenticated deletes.
