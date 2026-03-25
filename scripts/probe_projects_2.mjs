import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://txgmgerubmhwibrkszhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8'
);

const ALL_COLS = ['gross', 'net', 'deal_value', 'total_value'];
const base = { client_name: 'PROJ_PROBE_2', status: 'active' };

for (const col of ALL_COLS) {
  const { error } = await s.from('projects').insert({ ...base, [col]: 1000 });
  if (!error) {
    console.log('✅ VALID:', col);
    await s.from('projects').delete().eq('client_name', 'PROJ_PROBE_2');
  } else {
    console.log('❌ INVALID:', col, '(' + error.message.slice(0, 40) + ')');
  }
}
