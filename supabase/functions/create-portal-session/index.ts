// supabase/functions/create-portal-session/index.ts
// Deploy with: supabase functions deploy create-portal-session

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@13'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

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

    // Get their Stripe customer ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      // No customer ID — reset pro status so the user can go through checkout
      await supabase
        .from('profiles')
        .update({ is_pro: false, pro_expires_at: null })
        .eq('id', user.id)
      return new Response(
        JSON.stringify({ error: 'No Stripe subscription found for this account. Your pro status has been reset — please subscribe again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { returnUrl } = await req.json()

    // Create Stripe Customer Portal session
    let portalSession
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: returnUrl || 'https://your-app.vercel.app/settings',
      })
    } catch (stripeErr: any) {
      // Stale customer ID — clean it up so the user can re-subscribe
      if (stripeErr?.code === 'resource_missing') {
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: null, is_pro: false, pro_expires_at: null })
          .eq('id', user.id)
        return new Response(
          JSON.stringify({ error: 'Your billing record was not found in Stripe (possible test/live mode mismatch). Your account has been reset — please subscribe again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      throw stripeErr
    }

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Portal session error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
