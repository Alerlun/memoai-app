// supabase/functions/stripe-webhook/index.ts
// Deploy with: supabase functions deploy stripe-webhook
// Set secret: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx STRIPE_SECRET_KEY=sk_live_xxx
// Add these events in Stripe dashboard:
//   checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted, invoice.payment_failed

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

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  console.log('Stripe event:', event.type)

  try {
    switch (event.type) {

      // ── Payment succeeded → activate Pro ──────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const customerId = session.customer as string

        if (!userId) {
          console.error('No client_reference_id on session:', session.id)
          break
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            is_pro: true,
            stripe_customer_id: customerId,
            pro_expires_at: null,
          })
          .eq('id', userId)

        if (error) console.error('Error activating pro:', error)
        else console.log('Pro activated for user:', userId)
        break
      }

      // ── Subscription updated → track cancel_at_period_end ─────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        if (subscription.cancel_at_period_end) {
          // User cancelled — keep pro until end of billing period
          const expiresAt = new Date(subscription.current_period_end * 1000).toISOString()
          const { error } = await supabase
            .from('profiles')
            .update({ pro_expires_at: expiresAt })
            .eq('stripe_customer_id', customerId)
          if (error) console.error('Error setting pro_expires_at:', error)
          else console.log('Pro set to expire at:', expiresAt, 'for customer:', customerId)
        } else {
          // Subscription reactivated or renewed
          const { error } = await supabase
            .from('profiles')
            .update({ pro_expires_at: null })
            .eq('stripe_customer_id', customerId)
          if (error) console.error('Error clearing pro_expires_at:', error)
          else console.log('Pro expiry cleared for customer:', customerId)
        }
        break
      }

      // ── Subscription ended → revoke Pro ───────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { error } = await supabase
          .from('profiles')
          .update({ is_pro: false, pro_expires_at: null })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('Error revoking pro:', error)
        else console.log('Pro revoked for customer:', customerId)
        break
      }

      // ── Payment failed ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Payment failed for customer:', invoice.customer)
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }
  } catch (err) {
    console.error('Handler error:', err)
    return new Response(JSON.stringify({ error: 'Handler error' }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
