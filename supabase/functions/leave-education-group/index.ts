// supabase/functions/leave-education-group/index.ts
// Deploy: supabase functions deploy leave-education-group

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cl = parseInt(req.headers.get('content-length') ?? '0', 10)
    if (cl > 4_096) return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    // Remove membership row
    const { error: memberError } = await supabase
      .from('education_members')
      .delete()
      .eq('user_id', user.id)

    if (memberError) throw new Error('Could not leave group: ' + memberError.message)

    // Revoke Education tier
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_education: false,
        education_group_id: null,
      })
      .eq('id', user.id)

    if (profileError) throw new Error('Could not update profile: ' + profileError.message)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Leave group error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
