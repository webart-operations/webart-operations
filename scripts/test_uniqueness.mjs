import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://txgmgerubmhwibrkszhb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8')

async function checkTriggersAndConstraints() {
  // Test if a unique constraint exists on submission_id by trying a double insert (unlikely to work with service role if RLS is weird, but we'll try)
  const testSubId = '00000000-0000-0000-0000-000000000001'
  
  console.log("Checking if we can insert twice for same submission_id...")
  const { error: e1 } = await supabase.from('projects').insert({ submission_id: testSubId, client_name: 'TEST_DELETE_ME' })
  const { error: e2 } = await supabase.from('projects').insert({ submission_id: testSubId, client_name: 'TEST_DELETE_ME_2' })
  
  if (e2 && e2.code === '23505') {
    console.log("CONFIRMED: Unique constraint on submission_id exists.")
  } else {
    console.log("NO UNIQUE CONSTRAINT: Second insert succeeded or failed with other error:", e2?.message)
    // Clean up
    await supabase.from('projects').delete().eq('submission_id', testSubId)
  }
}

checkTriggersAndConstraints()
