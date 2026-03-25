import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { type, contact, appointment } = payload

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Handle New Lead / Contact Sync
    if (type === 'contact_created' || type === 'contact_updated') {
      const { first_name, last_name, email, phone, company_name, custom_fields } = contact
      const client_name = `${first_name} ${last_name}`.trim()
      
      // Check if product is in custom fields
      const product = custom_fields?.['product_interest'] || 'GHL Lead'

      const { error } = await supabase.from('submissions').insert({
        client_name,
        business_name: company_name || 'N/A',
        email,
        phone,
        product,
        source_info: 'ghl_webhook',
        status: 'pending'
      })

      if (error) throw error
    }

    // 2. Handle Appointment Sync
    if (type === 'appointment_booked' || type === 'appointment_status_changed') {
      const { 
        contact_id, 
        contact_name, 
        contact_email, 
        contact_phone,
        start_time,
        timezone,
        status, 
        user_name, // Assigned user in GHL
        notes,
        meeting_link 
      } = appointment

      const dateObj = new Date(start_time)
      const meeting_date = dateObj.toISOString().split('T')[0]
      const meeting_time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

      // Map GHL status to Platform status
      let finalStatus = 'scheduled'
      if (status === 'showed') finalStatus = 'completed'
      if (status === 'no-show') finalStatus = 'no_show'
      if (status === 'cancelled' || status === 'invalid') finalStatus = 'cancelled'

      // Upsert based on GHL contact or a specific GHL Appointment ID if provided
      const { error } = await supabase.from('meetings').upsert({
        client_name: contact_name,
        email: contact_email,
        phone: contact_phone,
        meeting_date,
        meeting_time,
        timezone,
        status: finalStatus,
        assigned_to: user_name,
        additional_notes: notes,
        meeting_link: meeting_link,
        source_id: appointment.id // Store GHL Appt ID to prevent duplicates
      }, { onConflict: 'source_id' })

      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('GHL Webhook Error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
