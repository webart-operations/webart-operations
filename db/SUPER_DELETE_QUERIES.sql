-- 1. Enable RLS explicitly on all tables
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_update_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactivation_leads ENABLE ROW LEVEL SECURITY;

-- 2. Drop any old, broken policies if they exist to prevent conflicts (Ignore warnings if they don't exist)
DROP POLICY IF EXISTS "Allow authenticated deletes on submissions" ON submissions;
DROP POLICY IF EXISTS "Allow authenticated deletes on projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated deletes on clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated deletes on revenue_ledger" ON revenue_ledger;
DROP POLICY IF EXISTS "Allow authenticated deletes on project_update_logs" ON project_update_logs;
DROP POLICY IF EXISTS "Allow authenticated deletes on qa_audits" ON qa_audits;
DROP POLICY IF EXISTS "Allow authenticated deletes on reactivation_leads" ON reactivation_leads;

-- 3. Create fresh, guaranteed-working DELETE policies for ALL authenticated users
CREATE POLICY "Allow authenticated deletes on submissions" ON submissions FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated deletes on projects" ON projects FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated deletes on clients" ON clients FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated deletes on revenue_ledger" ON revenue_ledger FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated deletes on project_update_logs" ON project_update_logs FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated deletes on qa_audits" ON qa_audits FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated deletes on reactivation_leads" ON reactivation_leads FOR DELETE USING (auth.role() = 'authenticated');

-- Done!
