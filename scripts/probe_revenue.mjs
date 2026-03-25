import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://txgmgerubmhwibrkszhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8'
);

const ALL_COLS = [
  'id', 'created_at', 'project_id', 'client_name', 'logged_by', 'logged_by_id',
  'currency', 'original_amount', 'exchange_rate', 'amount_usd', 'payment_date',
  'payment_type', 'product', 'installment', 'paid_through', 'notes', 'locked'
];

const base = { client_name: 'REVENUE_PROBE', amount_usd: 100, locked: true };

console.log('Probing revenue_ledger columns...\n');
const valid = [];
const invalid = [];

for (const col of ALL_COLS) {
  if (['id', 'created_at', 'client_name', 'amount_usd', 'locked'].includes(col)) {
    valid.push(col + ' (base)');
    continue;
  }
  
  const { error } = await s.from('revenue_ledger').insert({ ...base, [col]: (col === 'project_id' || col === 'logged_by_id' ? '00000000-0000-0000-0000-000000000000' : 'test') });
  
  if (!error) {
    valid.push(col);
    await s.from('revenue_ledger').delete().eq('client_name', 'REVENUE_PROBE');
  } else if (error.message.includes('schema cache') || error.message.includes('Could not find')) {
    invalid.push(col);
  } else {
    valid.push(col + ' (ERROR: ' + error.message.slice(0, 50) + ')');
    await s.from('revenue_ledger').delete().eq('client_name', 'REVENUE_PROBE');
  }
}

console.log('✅ VALID REVENUE COLUMNS:', valid.join(', '));
console.log('\n❌ INVALID REVENUE COLUMNS:', invalid.join(', '));
