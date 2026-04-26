// supabase/functions/verify-education-payment/index.ts
// Fallback for when the Stripe webhook fails to deliver checkout.session.completed.
// Called by the frontend polling loop after payment redirect.
// Deploy: supabase functions deploy verify-education-payment

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    // Find the most recent inactive education group owned by this user
    const { data: group } = await supabase
      .from('education_groups')
      .select('id, stripe_customer_id, plan_type, max_students')
      .eq('owner_id', user.id)
      .eq('is_active', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!group) {
      return new Response(
        JSON.stringify({ status: 'no_pending_group' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const customerId = group.stripe_customer_id
    if (!customerId) {
      return new Response(
        JSON.stringify({ status: 'no_customer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Search Stripe for a completed checkout session for this group
    const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 10 })
    const paidSession = sessions.data.find(s =>
      s.metadata?.group_id === group.id && s.payment_status === 'paid',
    )

    if (!paidSession) {
      return new Response(
        JSON.stringify({ status: 'payment_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const subscriptionId = paidSession.subscription as string

    // Activate the group
    await supabase
      .from('education_groups')
      .update({ is_active: true, stripe_subscription_id: subscriptionId, expires_at: null })
      .eq('id', group.id)

    // Add owner as educator member
    await supabase.from('education_members').upsert(
      { group_id: group.id, user_id: user.id, role: 'educator' },
      { onConflict: 'group_id,user_id' },
    )

    // Activate education on profile
    await supabase
      .from('profiles')
      .update({ is_education: true, education_group_id: group.id, role: 'educator' })
      .eq('id', user.id)

    console.log('Education activated via verify fallback — group:', group.id, 'user:', user.id)

    return new Response(
      JSON.stringify({ status: 'activated', groupId: group.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Verify payment error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
