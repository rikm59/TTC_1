import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRICE_IDS: Record<string, string | undefined> = {
  'contractor':    Deno.env.get('STRIPE_PRICE_CONTRACTOR'),
  'subcontractor': Deno.env.get('STRIPE_PRICE_SUBCONTRACTOR'),
  'labor-only':    Deno.env.get('STRIPE_PRICE_LABOR_ONLY'),
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://xpertaisolution.com'

    if (!STRIPE_SECRET_KEY) {
      return json({ error: 'Stripe not configured' }, 500)
    }

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const jwt = authHeader.slice(7)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, stripe_customer_id, full_name')
      .eq('id', user.id)
      .single()

    const accountType: string = profile?.account_type ?? 'contractor'
    const priceId = PRICE_IDS[accountType]
    if (!priceId) {
      return json({ error: `No Stripe price configured for account type: ${accountType}` }, 400)
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

    // Create or retrieve Stripe customer
    let customerId: string = profile?.stripe_customer_id ?? ''
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id, account_type: accountType },
      })
      customerId = customer.id
      const { error: custErr } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
      if (custErr) console.error('[create-checkout] failed to save stripe_customer_id:', custErr.message)
    }

    // Create checkout session with 14-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: user.id, account_type: accountType },
      },
      success_url: `${APP_BASE_URL}/?checkout=success`,
      cancel_url: `${APP_BASE_URL}/?checkout=cancelled`,
      allow_promotion_codes: true,
    })

    return json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout]', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
