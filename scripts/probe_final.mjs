import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://txgmgerubmhwibrkszhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8'
);

// EXACT payload that SalesForm.jsx now sends after all fixes
const { data, error } = await s.from('submissions').insert({
  client_id: null,
  client_name: 'TEST_FINAL',
  business_name: 'Test Business Inc',
  email: 'client@test.com',
  phone: '+1 555 1234',
  website: 'https://testclient.com',
  address: '123 Main Street, New York',
  country: 'USA',
  product: 'Web Design',
  rep: 'John Smith',
  closer: 'Jane Doe',
  terms: 'Full Upfront',   // <-- renamed from payment_term
  sale_date: '2025-03-20',
  currency: 'USD',
  gross: 5000,
  net: 4000,
  sales_remarks: 'Client is very interested in premium package. Signed agreement.',
  status: 'pending',
  submitted_by: 'Sales User',  // <-- was submitted_by_id
}).select('id');

if (!error) {
  console.log('✅ FINAL SALES FORM INSERT: SUCCESS! ID =', data[0]?.id);
  await s.from('submissions').delete().eq('client_name', 'TEST_FINAL');
  console.log('✅ Cleanup done.');
} else {
  console.log('❌ STILL FAILING:', error.message);
  console.log('Full error:', JSON.stringify(error));
}
