import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://txgmgerubmhwibrkszhb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
  console.log('--- Inspecting Submissions Table via SELECT ---');
  // Try to get one row to see keys
  const { data, error } = await supabase.from('submissions').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching data:', error);
  } else if (data && data.length > 0) {
    console.log('Columns found in first row:', Object.keys(data[0]));
    console.log('First row data:', data[0]);
  } else {
    console.log('Table is empty. Attempting to query information_schema via RPC or direct SQL if possible.');
    // Standard Supabase doesn't expose information_schema via REST unless we use a custom function
    // But we can try to insert a dummy row with only ID to see what errors we get
    const { error: insErr } = await supabase.from('submissions').insert({ client_name: 'TEST_PROBE' });
    console.log('Dummy insert result:', insErr ? insErr.message : 'Success!');
  }
}

checkSchema();
