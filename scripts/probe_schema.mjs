import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://txgmgerubmhwibrkszhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8'
);

// All columns the forms are trying to send
const ALL_COLS = [
  'id', 'created_at', 'client_id', 'project_id',
  'client_name', 'business_name', 'email', 'phone', 'website', 'address', 'country',
  'product', 'rep', 'closer', 'sale_date', 'currency', 'gross', 'net',
  'usd_gross', 'payment_term', 'sales_remarks', 'status', 'submitted_by',
  'assigned_am', 'assigned_pm', 'is_reactivation',
  // Legacy/alternative names to check
  'terms', 'deliverables', 'fee', 'submitted_by_id', 'notes', 'remarks'
];

const base = { client_name: 'SCHEMA_PROBE', submitted_by: 'Test', status: 'pending' };

console.log('Probing columns...\n');
const valid = [];
const invalid = [];

for (const col of ALL_COLS) {
  if (['id', 'created_at', 'client_name', 'submitted_by', 'status'].includes(col)) {
    valid.push(col + ' (base)');
    continue;
  }
  const testVal = typeof 1 === 'number' ? 'test' : 'test';
  const { error } = await s.from('submissions').insert({ ...base, [col]: 'test' });
  
  if (!error) {
    valid.push(col);
    // Cleanup
    await s.from('submissions').delete().eq('client_name', 'SCHEMA_PROBE');
  } else if (error.message.includes('schema cache') || error.message.includes('Could not find')) {
    invalid.push(col);
  } else {
    valid.push(col + ' (has constraint: ' + error.message.slice(0, 50) + ')');
    await s.from('submissions').delete().eq('client_name', 'SCHEMA_PROBE').then(() => {});
  }
}

console.log('✅ VALID COLUMNS:', valid.join(', '));
console.log('\n❌ INVALID COLUMNS:', invalid.join(', '));
