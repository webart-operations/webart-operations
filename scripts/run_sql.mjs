import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
const sql = fs.readFileSync('UNIQUE_FIX.sql', 'utf8');

async function run() {
  const { data, error } = await db.rpc('exec_sql', { sql: sql });
  console.log('Result:', data, error);
}
run();
