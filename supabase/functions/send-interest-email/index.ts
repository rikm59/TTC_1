import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM_EMAIL = 'noreply@xpertaisolution.com'
const ADMIN_EMAIL = 'rmartin@xpertaisolution.com'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) return json({ error: 'Email service not configured' }, 500)

    const {
      useExistingDetails,
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      logoUrl,
      imageUrls = [],
      stylePreference,
      colorPreferences,
      budgetRange,
      timeline,
      specialDetails,
    } = await req.json()

    const displayName = businessName || 'Unnamed Business'

    const row = (label: string, value: string | null | undefined) =>
      value ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:130px;vertical-align:top">${label}</td><td style="padding:4px 0;font-size:13px;color:#1f2937;font-weight:500">${escapeHtml(String(value))}</td></tr>` : ''

    const imageList = (imageUrls as string[]).filter(Boolean)
    const imageHtml = imageList.length
      ? `<p style="margin:16px 0 8px;font-size:13px;font-weight:bold;color:#1f2937">Reference Photos (${imageList.length})</p>` +
        imageList.map(u => `<a href="${escapeHtml(u)}" style="display:inline-block;margin:4px;font-size:12px;color:#3f36cb">${escapeHtml(u)}</a>`).join('<br>')
      : ''

    const logoHtml = logoUrl
      ? `<p style="margin:16px 0 8px;font-size:13px;font-weight:bold;color:#1f2937">Logo</p><a href="${escapeHtml(logoUrl)}" style="font-size:12px;color:#3f36cb">${escapeHtml(logoUrl)}</a>`
      : ''

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#333">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr>
          <td style="background:#3f36cb;padding:28px 32px;border-radius:12px 12px 0 0">
            <p style="margin:0;font-size:22px;font-weight:bold;color:#fff">New Website Interest</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">${escapeHtml(displayName)} · ${useExistingDetails ? 'Use existing site details' : 'New website'}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${row('Business', businessName)}
              ${row('Address', businessAddress)}
              ${row('Phone', businessPhone)}
              ${row('Email', businessEmail)}
              ${row('Style', stylePreference)}
              ${row('Colors', colorPreferences)}
              ${row('Budget', budgetRange)}
              ${row('Timeline', timeline)}
            </table>
            ${specialDetails ? `<p style="margin:16px 0 8px;font-size:13px;font-weight:bold;color:#1f2937">Special Details</p><p style="margin:0;font-size:13px;color:#555;line-height:1.6">${escapeHtml(specialDetails)}</p>` : ''}
            ${logoHtml}
            ${imageHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <p style="margin:0;font-size:12px;color:#9ca3af">XpertAI Estimator · New Lead Notification</p>
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
      body: JSON.stringify({ from: `XpertAI Estimator <${FROM_EMAIL}>`, to: [ADMIN_EMAIL], subject: `New Website Interest: ${displayName}`, html }),
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
