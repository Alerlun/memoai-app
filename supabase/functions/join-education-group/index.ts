// supabase/functions/join-education-group/index.ts
// Deploy: supabase functions deploy join-education-group

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

const MAX_BODY    = 4_096
const RATE_LIMIT  = 5
const RATE_WINDOW = 15

async function checkRateLimit(userId: string, action: string): Promise<void> {
  const since = new Date(Date.now() - RATE_WINDOW * 60_000).toISOString()
  const { count } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('action', action).gte('created_at', since)
  if ((count ?? 0) >= RATE_LIMIT) throw new Error(`Too many attempts — try again in ${RATE_WINDOW} minutes.`)
  await supabase.from('rate_limit_log').insert({ user_id: userId, action })
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

    await checkRateLimit(user.id, 'join_group')

    const { joinCode } = await req.json()
    if (!joinCode?.trim()) throw new Error('Missing joinCode')
    const sanitizedCode = String(joinCode).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (sanitizedCode.length < 4 || sanitizedCode.length > 10) throw new Error('Invalid join code format')

    // Look up the group by join code
    const { data: group, error: groupError } = await supabase
      .from('education_groups')
      .select('id, name, is_active, owner_id, max_students')
      .eq('join_code', sanitizedCode)
      .maybeSingle()

    if (groupError) throw new Error('Database error')
    if (!group) throw new Error('Invalid join code')
    if (!group.is_active) throw new Error('This group does not have an active Education subscription')

    // Prevent owner from joining their own group as a student
    if (group.owner_id === user.id) {
      return new Response(
        JSON.stringify({ groupId: group.id, groupName: group.name, alreadyMember: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Enforce student limit
    const maxStudents = group.max_students ?? 30
    const { count: memberCount } = await supabase
      .from('education_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)
    if ((memberCount ?? 0) >= maxStudents) {
      throw new Error(`This group is full (${maxStudents} student limit reached)`)
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('education_members')
      .select('user_id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ groupId: group.id, groupName: group.name, alreadyMember: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Use the user's profile role so educators join as 'educator', not 'student'
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const memberRole = userProfile?.role === 'educator' ? 'educator' : 'student'

    // Add to members table
    const { error: memberError } = await supabase
      .from('education_members')
      .insert({ group_id: group.id, user_id: user.id, role: memberRole })

    if (memberError) throw new Error('Could not join group: ' + memberError.message)

    // Activate Education tier on their profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_education: true,
        education_group_id: group.id,
        role: memberRole,
      })
      .eq('id', user.id)

    if (profileError) throw new Error('Could not activate Education: ' + profileError.message)

    return new Response(
      JSON.stringify({ groupId: group.id, groupName: group.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Join group error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
