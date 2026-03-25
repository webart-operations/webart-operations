-- SECURITY HARDENING: TIGHTEN DELETE POLICIES
-- Only CEO/QA should be allowed to delete core records.

-- 1. SUBMISSIONS
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON submissions;
CREATE POLICY "Enable delete for CEO/QA only" ON submissions
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ceo', 'qa')
  )
);

-- 2. PROJECTS
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON projects;
CREATE POLICY "Enable delete for CEO/QA only" ON projects
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ceo', 'qa')
  )
);

-- 3. CLIENTS
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON clients;
CREATE POLICY "Enable delete for CEO/QA only" ON clients
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ceo', 'qa')
  )
);

-- 4. REVENUE_LEDGER
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON revenue_ledger;
CREATE POLICY "Enable delete for CEO/QA only" ON revenue_ledger
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('ceo', 'qa')
  )
);

-- 5. QA_AUDITS
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON qa_audits;
CREATE POLICY "Enable delete for CEO only" ON qa_audits
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ceo'
  )
);

NOTIFY pgrst, 'reload schema';
