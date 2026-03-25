-- 1. Fix Submissions foreign key constraint
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_submitted_by_id_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_submitted_by_id_fkey FOREIGN KEY (submitted_by_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Fix other tables that might block a user deletion
ALTER TABLE qa_audits DROP CONSTRAINT IF EXISTS qa_audits_auditor_id_fkey;
ALTER TABLE qa_audits ADD CONSTRAINT qa_audits_auditor_id_fkey FOREIGN KEY (auditor_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE project_update_logs DROP CONSTRAINT IF EXISTS project_update_logs_author_id_fkey;
ALTER TABLE project_update_logs ADD CONSTRAINT project_update_logs_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE reactivation_leads DROP CONSTRAINT IF EXISTS reactivation_leads_requested_by_id_fkey;
ALTER TABLE reactivation_leads ADD CONSTRAINT reactivation_leads_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE revenue_ledger DROP CONSTRAINT IF EXISTS revenue_ledger_logged_by_id_fkey;
ALTER TABLE revenue_ledger ADD CONSTRAINT revenue_ledger_logged_by_id_fkey FOREIGN KEY (logged_by_id) REFERENCES profiles(id) ON DELETE SET NULL;
