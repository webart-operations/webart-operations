-- Run this in your Supabase SQL Editor to enable deletions across these tables for authenticated users.

-- 1. Submissions policies
CREATE POLICY "Allow authenticated deletes on submissions" 
ON submissions FOR DELETE 
USING (auth.role() = 'authenticated');

-- 2. Projects policies
CREATE POLICY "Allow authenticated deletes on projects" 
ON projects FOR DELETE 
USING (auth.role() = 'authenticated');

-- 3. Revenue Ledger policies
CREATE POLICY "Allow authenticated deletes on revenue_ledger" 
ON revenue_ledger FOR DELETE 
USING (auth.role() = 'authenticated');

-- 4. Clients policies
CREATE POLICY "Allow authenticated deletes on clients" 
ON clients FOR DELETE 
USING (auth.role() = 'authenticated');

-- 5. QA Audits policies
CREATE POLICY "Allow authenticated deletes on qa_audits" 
ON qa_audits FOR DELETE 
USING (auth.role() = 'authenticated');

-- 6. Project Update Logs policies
CREATE POLICY "Allow authenticated deletes on project_update_logs" 
ON project_update_logs FOR DELETE 
USING (auth.role() = 'authenticated');

-- 7. Reactivation Leads policies
CREATE POLICY "Allow authenticated deletes on reactivation_leads" 
ON reactivation_leads FOR DELETE 
USING (auth.role() = 'authenticated');
