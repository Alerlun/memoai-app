// supabase/functions/call-ai/index.ts
// Proxies OpenAI calls server-side so the API key never reaches the browser.
// Deploy: supabase functions deploy call-ai
// Secret: supabase secrets set OPENAI_API_KEY=sk-...

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

const MAX_BODY    = 32_768  // 32 KB — prompts are text, this is generous
const MAX_TOKENS  = 4_000   // hard cap regardless of what client requests
const RATE_LIMIT  = 30      // requests per window
const RATE_WINDOW = 15      // minutes

async function checkRateLimit(userId: string): Promise<void> {
  const since = new Date(Date.now() - RATE_WINDOW * 60_000).toISOString()
  const { count } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'call_ai')
    .gte('created_at', since)
  if ((count ?? 0) >= RATE_LIMIT) {
    throw new Error(`Too many AI requests — please wait ${RATE_WINDOW} minutes.`)
  }
  await supabase.from('rate_limit_log').insert({ user_id: userId, action: 'call_ai' })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return json({ error: 'Unauthorized' }, 401)

    // ── Body size ─────────────────────────────────────────────────────────────
    const cl = parseInt(req.headers.get('content-length') ?? '0', 10)
    if (cl > MAX_BODY) return json({ error: 'Payload too large' }, 413)

    // ── Rate limit ────────────────────────────────────────────────────────────
    await checkRateLimit(user.id)

    // ── Parse & validate ──────────────────────────────────────────────────────
    const body = await req.json()
    const { messages, max_tokens = 2500 } = body

    if (!Array.isArray(messages) || messages.length === 0) return json({ error: 'Invalid messages' }, 400)
    if (messages.length > 50) return json({ error: 'Too many messages' }, 400)

    const safeMaxTokens = Math.min(Math.max(1, Number(max_tokens) || 2500), MAX_TOKENS)

    // ── Forward to OpenAI ─────────────────────────────────────────────────────
    const openAIKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIKey) throw new Error('AI service not configured')

    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAIKey}` },
      body: JSON.stringify({ model, messages, max_completion_tokens: safeMaxTokens }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`AI ${res.status}: ${(err as any)?.error?.message ?? 'Unknown error'}`)
    }

    const data = await res.json()
    const content: string = (data as any).choices?.[0]?.message?.content ?? ''

    return json({ content })
  } catch (err: any) {
    const status = err.message?.includes('Rate limit') ? 429 : 400
    return json({ error: err.message }, status)
  }
})
