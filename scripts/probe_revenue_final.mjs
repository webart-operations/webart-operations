import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://txgmgerubmhwibrkszhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8'
);

const { data, error } = await s.from('revenue_ledger').insert({
  client_name: 'REV_FINAL_TEST',
  amount_usd: 100,
  locked: true,
  logged_by: 'Test',
  payment_type: 'Initial Payment',
  product: 'Web Design',
  installment: '1st',
  paid_through: 'Stripe'
}).select('id');

if (!error) {
  console.log('✅ REVENUE INSERT SUCCESS! ID =', data[0]?.id);
  await s.from('revenue_ledger').delete().eq('client_name', 'REV_FINAL_TEST');
  console.log('✅ Cleanup done.');
} else {
  console.log('❌ REVENUE INSERT FAILED:', error.message);
}
