-- Add team column to tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'N/A';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'N/A';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'N/A';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'N/A';

-- Fix role constraint to include 'manager'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('ceo', 'qa', 'am', 'pm', 'sales', 'manager'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team);
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team);
CREATE INDEX IF NOT EXISTS idx_clients_team ON clients(team);
CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions(team);



