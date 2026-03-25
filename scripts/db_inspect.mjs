import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function inspect() {
  console.log("Checking columns in 'submissions'...")
  const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { t_name: 'submissions' })
  if (colErr) {
    console.log("Fallback: Querying a single row from submissions...")
    const { data: row, error: rowErr } = await supabase.from('submissions').select('*').limit(1).single()
    if (row) console.log("Columns found:", Object.keys(row))
    else console.log("No rows in submissions or error:", rowErr)
  } else {
    console.log("Columns:", cols)
  }

  console.log("\nChecking for triggers on 'submissions'...")
  // We can't easily query pg_trigger via anon key unless we have a RPC. 
  // Let's try to see if there's any suspicious activity in the 'projects' table.
  const { data: recentProjs } = await supabase.from('projects').select('created_at, client_name, product').order('created_at', { ascending: false }).limit(5)
  console.log("Recent Projects:", recentProjs)
}

inspect()
