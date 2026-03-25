import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://txgmgerubmhwibrkszhb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTcxNzcsImV4cCI6MjA4OTM3MzE3N30.nG6QFecke3V6oElhQU7wEPpqJdxlnuoubIQTm3qP7Ho')

async function check() {
  console.log("--- SUBMISSIONS ---")
  const { data: sData, error: sErr } = await supabase.from('submissions').select('*').limit(1)
  if (sData?.[0]) console.log(Object.keys(sData[0]))
  else console.log("Empty or Error:", sErr)

  console.log("\n--- PROJECTS ---")
  const { data: pData, error: pErr } = await supabase.from('projects').select('*').limit(1)
  if (pData?.[0]) console.log(Object.keys(pData[0]))
  else console.log("Empty or Error:", pErr)
}

check()
