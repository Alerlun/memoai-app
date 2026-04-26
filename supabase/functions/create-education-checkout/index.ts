// supabase/functions/create-education-checkout/index.ts
// Deploy: supabase functions deploy create-education-checkout
// Env:    STRIPE_SECRET_KEY, STRIPE_CLASS_PRICE_ID, STRIPE_SCHOOL_PRICE_ID

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

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

const MAX_BODY   = 4_096
const RATE_LIMIT = 5
const RATE_WIN   = 60 // 5 checkout attempts per hour

const PLAN_CONFIG: Record<string, { maxStudents: number; priceEnvVar: string; label: string }> = {
  class:  { maxStudents: 30,  priceEnvVar: 'STRIPE_CLASS_PRICE_ID',  label: 'Class Plan'  },
  school: { maxStudents: 600, priceEnvVar: 'STRIPE_SCHOOL_PRICE_ID', label: 'School Plan' },
}

async function checkRateLimit(userId: string): Promise<void> {
  const since = new Date(Date.now() - RATE_WIN * 60_000).toISOString()
  const { count } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('action', 'edu_checkout').gte('created_at', since)
  if ((count ?? 0) >= RATE_LIMIT) throw new Error(`Too many checkout attempts — try again in ${RATE_WIN} minutes.`)
  await supabase.from('rate_limit_log').insert({ user_id: userId, action: 'edu_checkout' })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cl = parseInt(req.headers.get('content-length') ?? '0', 10)
    if (cl > MAX_BODY) return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    await checkRateLimit(user.id)

    const { groupName, planType = 'class', successUrl, cancelUrl } = await req.json()
    if (!groupName?.trim()) throw new Error('Missing groupName')
    if (groupName.trim().length > 200) throw new Error('Group name too long (max 200 characters)')

    const plan = PLAN_CONFIG[planType]
    if (!plan) throw new Error('Invalid plan type — must be "class" or "school"')

    const priceId = Deno.env.get(plan.priceEnvVar)
    if (!priceId) throw new Error(`${plan.label} is not configured — contact support`)

    // Generate a unique join code (retry on collision)
    let joinCode = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateJoinCode()
      const { data: existing } = await supabase
        .from('education_groups')
        .select('id')
        .eq('join_code', candidate)
        .maybeSingle()
      if (!existing) { joinCode = candidate; break }
    }
    if (!joinCode) throw new Error('Could not generate unique join code')

    // Create the group record (inactive until payment confirmed)
    const { data: group, error: groupError } = await supabase
      .from('education_groups')
      .insert({
        name: groupName.trim(),
        owner_id: user.id,
        join_code: joinCode,
        is_active: false,
        plan_type: planType,
        max_students: plan.maxStudents,
      })
      .select()
      .single()

    if (groupError) throw new Error('Could not create group: ' + groupError.message)

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId)
      } catch (e: any) {
        if (e?.code === 'resource_missing') {
          await supabase.from('profiles').update({ stripe_customer_id: null }).eq('id', user.id)
          customerId = null
        } else {
          throw e
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    await supabase.from('education_groups').update({ stripe_customer_id: customerId }).eq('id', group.id)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl ?? `${req.headers.get('origin') ?? ''}/settings?edu=success`,
      cancel_url: cancelUrl ?? `${req.headers.get('origin') ?? ''}/education/setup?edu=cancelled`,
      client_reference_id: user.id,
      metadata: { group_id: group.id },
      subscription_data: { metadata: { group_id: group.id } },
    })

    return new Response(
      JSON.stringify({ url: session.url, joinCode, groupId: group.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Education checkout error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
