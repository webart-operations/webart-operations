-- 1. PROJECT SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.project_services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    service_name text NOT NULL,
    gross_value numeric(10, 2) DEFAULT 0,
    net_value numeric(10, 2) DEFAULT 0,
    currency text DEFAULT 'USD',
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on Project Services
ALTER TABLE public.project_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access" ON public.project_services
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. REVENUE LEDGER UPDATES
ALTER TABLE public.revenue_ledger ADD COLUMN IF NOT EXISTS collected_by text;
ALTER TABLE public.revenue_ledger ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.project_services(id) ON DELETE SET NULL;

-- 3. UNIQUE CLIENT CONSTRAINT
-- Ensure client email and business_name are treated as unique where possible 
-- (Existing data might have duplicates, so we might need to handle this in application logic first)
-- For now, we'll rely on the AuditQueue's matching logic which we will harden.

-- 4. AGGREGATION VIEW (Utility for real-time reporting)
CREATE OR REPLACE VIEW public.project_financial_summaries AS
SELECT 
    p.id as project_id,
    p.client_name,
    p.client_id,
    sum(ps.gross_value) as total_project_gross,
    sum(ps.net_value) as total_project_net,
    count(ps.id) as service_count
FROM public.projects p
LEFT JOIN public.project_services ps ON p.id = ps.project_id
GROUP BY p.id, p.client_name, p.client_id;

CREATE OR REPLACE VIEW public.client_financial_summaries AS
SELECT 
    c.id as client_id,
    c.client_name,
    c.business_name,
    sum(ps.gross_value) as total_client_gross,
    sum(ps.net_value) as total_client_net,
    count(ps.id) as total_service_count
FROM public.clients c
LEFT JOIN public.projects p ON c.id = p.client_id
LEFT JOIN public.project_services ps ON p.id = ps.project_id
GROUP BY c.id, c.client_name, c.business_name;

NOTIFY pgrst, 'reload schema';
