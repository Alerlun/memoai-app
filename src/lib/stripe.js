import { supabase } from './supabase.js'

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not logged in')
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function redirectToCheckout(userEmail, userId) {
  const headers = await getAuthHeader()
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    headers,
    body: {
      priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
      successUrl: `${window.location.origin}/settings?payment=success`,
      cancelUrl: `${window.location.origin}/settings?payment=cancelled`,
    },
  })
  if (error) throw new Error(error.message)
  if (data?.url) window.location.href = data.url
  else throw new Error('No checkout URL returned')
}

export async function redirectToPortal() {
  const headers = await getAuthHeader()
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    headers,
    body: { returnUrl: `${window.location.origin}/settings` },
  })
  if (error) {
    let msg = error.message
    try { const body = await error.context?.json(); msg = body?.error || msg } catch {}
    throw new Error(msg)
  }
  if (data?.url) window.location.href = data.url
  else throw new Error('No portal URL returned')
}
