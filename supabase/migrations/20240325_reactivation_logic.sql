-- Migration: Automated Reactivation Logic
-- 1. Add status column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Create the status update function
CREATE OR REPLACE FUNCTION fn_update_client_status_on_project_change()
RETURNS TRIGGER AS $$
DECLARE
    m_client_id uuid;
    active_count int;
    historical_count int;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        m_client_id := OLD.client_id;
    ELSE
        m_client_id := NEW.client_id;
    END IF;

    -- Count active projects (including at_risk)
    SELECT COUNT(*) INTO active_count 
    FROM projects 
    WHERE client_id = m_client_id AND status IN ('active', 'at_risk');

    -- Count historical projects (delivered, on_hold, etc)
    SELECT COUNT(*) INTO historical_count 
    FROM projects 
    WHERE client_id = m_client_id AND status IN ('on_hold', 'delivered', 'dead', 'closed');

    -- Update client status
    IF active_count > 0 THEN
        UPDATE clients SET status = 'active' WHERE id = m_client_id;
    ELSIF historical_count > 0 THEN
        UPDATE clients SET status = 'reactivation_eligible' WHERE id = m_client_id;
    ELSE
        UPDATE clients SET status = 'inactive' WHERE id = m_client_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trg_update_client_status ON projects;
CREATE TRIGGER trg_update_client_status
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION fn_update_client_status_on_project_change();

-- 4. Initial backfill of client statuses
UPDATE clients c
SET status = (
    CASE 
        WHEN EXISTS (SELECT 1 FROM projects p WHERE p.client_id = c.id AND p.status IN ('active', 'at_risk')) THEN 'active'
        WHEN EXISTS (SELECT 1 FROM projects p WHERE p.client_id = c.id AND p.status IN ('on_hold', 'delivered', 'dead', 'closed')) THEN 'reactivation_eligible'
        ELSE 'inactive'
    END
);

NOTIFY pgrst, 'reload schema';
