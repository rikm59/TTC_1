import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

serve(async (req: Request) => {
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
  const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response('Stripe not configured', { status: 500 })
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Verify webhook signature
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.supabase_user_id
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id

        if (!userId || !subscriptionId) break

        const { error } = await supabase.from('profiles').update({
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
          plan: 'enterprise',
        }).eq('id', userId)
        if (error) {
          console.error('[stripe-webhook] checkout profile update failed:', error.message)
          return new Response('DB update failed', { status: 500 })
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        const status = sub.status
        const plan = (status === 'active' || status === 'trialing') ? 'enterprise' : 'free'

        const { error } = await supabase.from('profiles').update({
          stripe_subscription_id: sub.id,
          subscription_status: status,
          plan,
          trial_expires_at: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
        }).eq('id', userId)
        if (error) {
          console.error('[stripe-webhook] subscription profile update failed:', error.message)
          return new Response('DB update failed', { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        const { error } = await supabase.from('profiles').update({
          subscription_status: 'canceled',
          plan: 'free',
        }).eq('id', userId)
        if (error) {
          console.error('[stripe-webhook] cancellation profile update failed:', error.message)
          return new Response('DB update failed', { status: 500 })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id
        if (!customerId) break

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          const { error } = await supabase.from('profiles').update({
            subscription_status: 'past_due',
          }).eq('id', profile.id)
          if (error) {
            console.error('[stripe-webhook] past_due profile update failed:', error.message)
            return new Response('DB update failed', { status: 500 })
          }
        }
        break
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
