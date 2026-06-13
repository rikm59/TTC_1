import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Invoked by a Supabase scheduled cron job (verify_jwt: false).
// Sends reminder emails to users whose 14-day trial expires in ≤3 days
// and haven't been sent a reminder yet.

const FROM_EMAIL = 'noreply@xpertaisolution.com'
const FROM_NAME = 'XpertAI Estimator'
const APP_URL = 'https://xpertaisolution.com'

serve(async (_req: Request) => {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const now = new Date()
    const cutoff = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from now

    // Find users with trial expiring within 3 days who haven't been reminded
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, plan, trial_expires_at, trial_reminder_sent')
      .eq('plan', 'free')
      .eq('trial_reminder_sent', false)
      .not('trial_expires_at', 'is', null)
      .lte('trial_expires_at', cutoff.toISOString())
      .gte('trial_expires_at', now.toISOString())

    if (error) {
      console.error('[send-trial-reminders] query error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    let sent = 0
    for (const profile of profiles) {
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
      if (!user?.email) continue

      const firstName = profile.first_name || user.email.split('@')[0]
      const expiresAt = new Date(profile.trial_expires_at)
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#333">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr>
          <td style="background:#3f36cb;padding:28px 32px;border-radius:12px 12px 0 0">
            <p style="margin:0;font-size:22px;font-weight:bold;color:#fff">XpertAI Estimator</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
            <p style="margin:0 0 16px;font-size:15px">Hi ${firstName},</p>
            <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6">
              Your free trial expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>. Upgrade now to keep access to all your estimates, client management, and reporting tools.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td align="center">
                  <a href="${APP_URL}" style="display:inline-block;background:#3f36cb;color:#fff;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none">
                    Upgrade My Account
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6">
              If you have any questions, just reply to this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <p style="margin:0;font-size:12px;color:#9ca3af">XpertAI Estimator &middot; xpertaisolution.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [user.email],
          subject: `Your XpertAI trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          html,
        }),
      })

      if (res.ok) {
        const { error: updateErr } = await supabase.from('profiles').update({ trial_reminder_sent: true }).eq('id', profile.id)
        if (updateErr) {
          console.error(`[send-trial-reminders] failed to mark reminder sent for ${user.email}:`, updateErr.message)
        } else {
          sent++
        }
      } else {
        console.error(`[send-trial-reminders] Resend failed for ${user.email}:`, await res.text())
      }
    }

    return new Response(JSON.stringify({ sent }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[send-trial-reminders] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
