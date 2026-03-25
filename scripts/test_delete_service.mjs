import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://txgmgerubmhwibrkszhb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8')

async function testDelete() {
  console.log("Fetching a submission to delete...")
  const { data: subs, error: fErr } = await supabase.from('submissions').select('id, client_name').limit(1)
  if (fErr) return console.error("Fetch Error:", fErr)
  if (!subs?.length) return console.log("No submissions found.")

  const targetId = subs[0].id
  console.log(`Attempting to delete submission: ${targetId} (${subs[0].client_name})`)

  const { error: dErr } = await supabase.from('submissions').delete().eq('id', targetId)
  if (dErr) {
    console.error("Delete failed with error:", dErr)
  } else {
    console.log("Delete successful (via service role).")
  }
}

testDelete()
