-- FINAL DOUBLE CREATION PROTECTOR
-- ENSURES A SUBMISSION CAN ONLY EVER PRODUCE ONE PROJECT

-- 1. Ensure submission_id is unique on projects
-- This will cause any secondary/automated insertion to FAIL if one already exists
ALTER TABLE projects ADD CONSTRAINT unique_submission_project UNIQUE (submission_id);

-- 2. Ensure clients aren't duplicated by email 
-- (Only if you want strict 1-client-per-email policy)
-- ALTER TABLE clients ADD CONSTRAINT unique_client_email UNIQUE (email);

-- 3. Safety check: any existing duplicates should be cleaned manually or 
-- via a script before applying this if it fails initially.
