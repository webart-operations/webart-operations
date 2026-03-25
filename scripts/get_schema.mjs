const headers = { 
  "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8", 
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z21nZXJ1Ym1od2licmtzemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc5NzE3NywiZXhwIjoyMDg5MzczMTc3fQ.rx-LyXqg5JQrZKxG3RYlZQa2qUYn447dYozYLWevkj8" 
};

async function getColumns(table) {
  try {
    const r = await fetch("https://txgmgerubmhwibrkszhb.supabase.co/rest/v1/", { headers });
    const json = await r.json();
    if (json.definitions && json.definitions[table]) {
      const cols = Object.keys(json.definitions[table].properties);
      console.log(`Columns for ${table}:`, cols.join(', '));
    } else {
      console.log(`Table ${table} not found in definitions.`);
    }
  } catch (err) {
    console.error(err);
  }
}

await getColumns('revenue_ledger');
await getColumns('projects');
await getColumns('submissions');
