import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://txgmgerubmhwibrkszhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8'
);

const ALL_COLS = [
  'id', 'created_at', 'client_id', 'client_name', 'product', 'amount', 'currency',
  'payment_status', 'deliverables', 'remarks', 'sales_remarks', 'notes',
  'assigned_am', 'assigned_pm', 'status'
];

const base = { client_name: 'PROJ_PROBE', status: 'active' };

console.log('Probing projects columns...\n');
const valid = [];
const invalid = [];

for (const col of ALL_COLS) {
  if (['id', 'created_at', 'client_name', 'status'].includes(col)) {
    valid.push(col + ' (base)');
    continue;
  }
  
  const { error } = await s.from('projects').insert({ ...base, [col]: 'test' });
  
  if (!error) {
    valid.push(col);
    await s.from('projects').delete().eq('client_name', 'PROJ_PROBE');
  } else if (error.message.includes('schema cache') || error.message.includes('Could not find')) {
    invalid.push(col);
  } else {
    valid.push(col + ' (ERROR: ' + error.message.slice(0, 50) + ')');
    await s.from('projects').delete().eq('client_name', 'PROJ_PROBE');
  }
}

console.log('✅ VALID PROJECTS COLUMNS:', valid.join(', '));
console.log('\n❌ INVALID PROJECTS COLUMNS:', invalid.join(', '));
