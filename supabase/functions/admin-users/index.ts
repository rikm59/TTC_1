import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const jwt = authHeader.slice(7)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: { user: caller }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !caller) return json({ error: 'Unauthorized' }, 401)

    const { data: callerProfile } = await supabase
      .from('profiles').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') return json({ error: 'Forbidden' }, 403)

    const body = await req.json()
    const { action, ...params } = body

    const logAction = async (
      act: string,
      targetUserId?: string,
      targetEmail?: string,
      details: Record<string, unknown> = {},
    ) => {
      const { error } = await supabase.from('admin_audit_log').insert({
        admin_id: caller.id,
        admin_email: caller.email,
        action: act,
        target_user_id: targetUserId ?? null,
        target_email: targetEmail ?? null,
        details,
      })
      if (error) console.error('[admin-users] audit log failed:', error.message)
    }

    // ── get_stats ──────────────────────────────────────────────────────────
    if (action === 'get_stats') {
      const { data: profiles } = await supabase
        .from('profiles').select('plan, subscription_status, created_at')

      const startOfMonth = new Date(
        new Date().getFullYear(), new Date().getMonth(), 1
      ).toISOString()

      const totalUsers = profiles?.length ?? 0
      const newThisMonth = profiles?.filter(p => p.created_at >= startOfMonth).length ?? 0

      const plans = { free: 0, pro: 0, enterprise: 0 }
      const statuses = { active: 0, trialing: 0, past_due: 0, canceled: 0, inactive: 0 }

      profiles?.forEach(p => {
        const plan = (p.plan ?? 'free') as keyof typeof plans
        if (plan in plans) plans[plan]++
        else plans.free++
        const status = (p.subscription_status ?? 'inactive') as keyof typeof statuses
        if (status in statuses) statuses[status]++
        else statuses.inactive++
      })

      await logAction('get_stats')
      return json({ totalUsers, newThisMonth, plans, statuses })
    }

    // ── list_users ─────────────────────────────────────────────────────────
    if (action === 'list_users') {
      const perPage = params.perPage ?? 200
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({
        page: 1, perPage,
      })
      if (listError) return json({ error: listError.message }, 500)

      const { data: profiles } = await supabase.from('profiles').select('*')
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

      const users = (authUsers.users ?? []).map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        banned_until: u.banned_until,
        profile: profileMap.get(u.id) ?? null,
      }))

      await logAction('list_users')
      return json({ users })
    }

    // ── reset_password ─────────────────────────────────────────────────────
    if (action === 'reset_password') {
      const { email } = params
      if (!email) return json({ error: 'email required' }, 400)

      const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://xpertaisolution.com'
      const { error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${APP_BASE_URL}/` },
      })
      if (error) return json({ error: error.message }, 500)

      const { data: found } = await supabase.auth.admin.listUsers()
      const target = found?.users?.find(u => u.email === email)
      await logAction('reset_password', target?.id, email, { email })
      return json({ ok: true })
    }

    // ── toggle_ban ─────────────────────────────────────────────────────────
    if (action === 'toggle_ban') {
      const { userId, banned } = params
      if (!userId) return json({ error: 'userId required' }, 400)

      const { data: { user: target } } = await supabase.auth.admin.getUserById(userId)
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: banned ? '876600h' : 'none',
      })
      if (error) return json({ error: error.message }, 500)

      await logAction('toggle_ban', userId, target?.email, { banned })
      return json({ ok: true })
    }

    // ── update_user ────────────────────────────────────────────────────────
    if (action === 'update_user') {
      const { userId, plan, role, subscriptionStatus, onboardingComplete } = params
      if (!userId) return json({ error: 'userId required' }, 400)

      const updates: Record<string, unknown> = {}
      if (plan !== undefined) updates.plan = plan
      if (role !== undefined) updates.role = role
      if (subscriptionStatus !== undefined) updates.subscription_status = subscriptionStatus
      if (onboardingComplete !== undefined) updates.onboarding_complete = onboardingComplete

      const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (error) return json({ error: error.message }, 500)

      const { data: { user: target } } = await supabase.auth.admin.getUserById(userId)
      await logAction('update_user', userId, target?.email, updates)
      return json({ ok: true })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    console.error('[admin-users]', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
