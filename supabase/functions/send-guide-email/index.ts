import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM_EMAIL = 'noreply@xpertaisolution.com'
const FROM_NAME = 'XpertAI Estimator'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!RESEND_API_KEY) {
      return json({ error: 'Email service not configured' }, 500)
    }

    const { userId, isResend = false } = await req.json()
    if (!userId) return json({ error: 'Missing userId' }, 400)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(userId)
    if (userErr || !user?.email) return json({ error: 'User not found' }, 404)

    const { data: profile } = await supabase.from('profiles').select('first_name, company_name, account_type').eq('id', userId).single()
    const firstName = profile?.first_name || user.email.split('@')[0]
    const accountType = profile?.account_type || 'contractor'
    const typeLabel = accountType === 'subcontractor' ? 'Sub-Contractor' : accountType === 'labor-only' ? 'Labor Only' : 'Contractor'

    const subject = isResend
      ? `Your XpertAI Estimator Quick-Start Guide`
      : `Welcome to XpertAI Estimator — Here's your quick-start guide`

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
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">Quick-Start Guide · ${typeLabel} Plan</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
            <p style="margin:0 0 16px;font-size:15px">Hi ${escapeHtml(firstName)},</p>
            <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6">
              ${isResend ? 'Here is your XpertAI Estimator quick-start guide as requested.' : 'Welcome to XpertAI Estimator! Here\'s everything you need to get started.'}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border:1px solid #e0e1ff;border-radius:10px;margin-bottom:24px">
              <tr><td style="padding:20px 24px">
                <p style="margin:0 0 12px;font-size:14px;font-weight:bold;color:#1f2937">Getting Started in 3 Steps:</p>
                <p style="margin:0 0 8px;font-size:13px;color:#555"><strong>1. Complete your profile</strong> — Add your company name, logo, license number, and contact info in Settings.</p>
                <p style="margin:0 0 8px;font-size:13px;color:#555"><strong>2. Create your first estimate</strong> — Select a project type, add materials, labor, and overhead. The calculator handles the math.</p>
                <p style="margin:0 0 0;font-size:13px;color:#555"><strong>3. Send it to your client</strong> — Email a PDF directly from the app, or share a link for digital approval.</p>
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6">
              If you have any questions, reply to this email and we'll help you get set up.
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

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [user.email], subject, html }),
    })

    const resendData = await resendRes.json()
    return json(resendData, resendRes.ok ? 200 : 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
