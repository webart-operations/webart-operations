-- This script natively fixes the exact database constraint blocking the Submissions deletion.
-- It tells the database to simply erase the linked ID rather than blocking the deletion.

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_submission_id_fkey;

ALTER TABLE clients ADD CONSTRAINT clients_submission_id_fkey 
FOREIGN KEY (submission_id) REFERENCES submissions(id) 
ON DELETE SET NULL;
