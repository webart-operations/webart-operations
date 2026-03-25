import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    
    // Validate required fields
    const required = ["client_name", "email", "meeting_date", "meeting_time", "source_id"];
    for (const field of required) {
      if (!payload[field]) throw new Error(`Missing required field: ${field}`);
    }

    const { data, error } = await supabaseClient
      .from("meetings")
      .upsert([{
        client_name: payload.client_name,
        email: payload.email,
        phone: payload.phone || "",
        meeting_date: payload.meeting_date,
        meeting_time: payload.meeting_time,
        timezone: payload.timezone || "UTC",
        status: payload.status || "scheduled",
        assigned_to: payload.assigned_to || "",
        meeting_link: payload.meeting_link || "",
        additional_notes: payload.additional_notes || "",
        source_id: payload.source_id || null
      }], { onConflict: 'source_id' })
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, id: data[0].id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
