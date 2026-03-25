import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://txgmgerubmhwibrkszhb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8'
);

// Do a comprehensive full insert like the Sales Form would
const { data, error } = await s.from('submissions').insert({
  client_name: 'FULL_TEST',
  business_name: 'Test Business',
  email: 'test@test.com',
  phone: '1234567890',
  website: 'https://test.com',
  address: '123 Street',
  country: 'USA',
  product: 'Web Design',
  rep: 'Test Rep',
  closer: 'Test Closer',
  terms: 'Full Payment',     // payment_term -> terms
  sale_date: '2025-03-01',
  currency: 'USD',
  gross: 1000,
  net: 800,
  sales_remarks: 'Test remarks',
  status: 'pending',
  submitted_by: 'Test User', // try submitted_by text
}).select('id');

if (!error) {
  console.log('✅ FULL INSERT SUCCESS - ID:', data[0]?.id);
  // Cleanup
  await s.from('submissions').delete().eq('client_name', 'FULL_TEST');
} else {
  console.log('❌ ERROR:', error.message);
  
  // Try with submitted_by_id (uuid column?)
  const { data: d2, error: e2 } = await s.from('submissions').insert({
    client_name: 'FULL_TEST2',
    business_name: 'Test Business',
    email: 'test@test.com',
    phone: '1234567890',
    address: '123 Street',
    country: 'USA',
    product: 'Web Design',
    rep: 'Test Rep',
    closer: 'Test Closer',
    terms: 'Full Payment',
    sale_date: '2025-03-01',
    currency: 'USD',
    gross: 1000,
    net: 800,
    sales_remarks: 'Test remarks',
    status: 'pending',
    // skip submitted_by columns entirely
  }).select('id');
  
  if (!e2) {
    console.log('✅ INSERT WITHOUT submitted_by WORKS - submitted_by may be nullable or named differently');
    await s.from('submissions').delete().eq('client_name', 'FULL_TEST2');
  } else {
    console.log('❌ STILL FAILING:', e2.message);
  }
}
