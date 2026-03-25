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
    const required = ["client_name", "email", "product", "gross", "net", "sale_date"];
    for (const field of required) {
      if (!payload[field]) throw new Error(`Missing required field: ${field}`);
    }

    const { data, error } = await supabaseClient
      .from("submissions")
      .insert([{
        client_name: payload.client_name,
        business_name: payload.business_name || payload.client_name,
        email: payload.email,
        phone: payload.phone || "",
        website: payload.website || "",
        address: payload.address || "",
        country: payload.country || "",
        product: payload.product,
        gross: Number(payload.gross || 0),
        net: Number(payload.net || 0),
        currency: payload.currency || "USD",
        rep: payload.rep || "External Webhook",
        closer: payload.closer || "",
        terms: payload.terms || "Standard",
        sale_date: payload.sale_date,
        sales_remarks: payload.sales_remarks || "",
        status: "pending",
        is_reactivation: payload.is_reactivation || false,
        submitted_by: "Automated Webhook"
      }])
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
