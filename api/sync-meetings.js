import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    ghl_meeting_id, client_name, phone, email,
    meeting_date, meeting_time, timezone,
    meeting_link, assigned_to, additional_notes, status
  } = req.body

  if (!client_name || !meeting_date || !meeting_time) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { error } = await supabase.from('meetings').upsert({
    ghl_meeting_id,
    client_name,
    phone,
    email,
    meeting_date,
    meeting_time,
    timezone:         timezone || 'UTC',
    meeting_link,
    assigned_to,
    additional_notes,
    status:           status || 'scheduled',
    synced_at:        new Date().toISOString()
  }, { onConflict: 'ghl_meeting_id' })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true })
}