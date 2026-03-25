import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://txgmgerubmhwibrkszhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8'
);

const base = { client_name: 'REV_VAR_PROBE', amount_usd: 100, locked: true, logged_by: 'Test' };

async function probe(variants) {
  for (const v of variants) {
    const { error } = await s.from('revenue_ledger').insert({ ...base, [v]: 'test' });
    if (!error) {
      console.log('✅ VALID:', v);
      await s.from('revenue_ledger').delete().eq('client_name', 'REV_VAR_PROBE');
      return v;
    }
  }
  return null;
}

console.log('Probing variations...\n');

console.log('Payment Type variants:');
await probe(['payment_type', 'type', 'category', 'payment_category', 'entry_type']);

console.log('Product variants:');
await probe(['product', 'service', 'product_name', 'deal_type']);

console.log('Installment variants:');
await probe(['installment', 'payment_plan', 'term', 'installment_name', 'terms']);

console.log('Paid Through variants:');
await probe(['paid_through', 'gateway', 'payment_method', 'method', 'source']);
