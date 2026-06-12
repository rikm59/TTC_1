import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const FROM_EMAIL = 'noreply@xpertaisolution.com'
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://xpertaisolution.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const url = new URL(req.url)

  // ── GET /estimate-share?token=xxx ────────────────────────────
  if (req.method === 'GET') {
    const token = url.searchParams.get('token')
    if (!token) return json({ error: 'Missing token' }, 400)

    const { data: row, error } = await sb
      .from('estimates')
      .select('id, share_token, status, data, user_id')
      .eq('share_token', token)
      .single()

    if (error || !row) return json({ error: 'Estimate not found or link expired' }, 404)

    // Fetch contractor company settings from profile
    const { data: profile } = await sb
      .from('profiles')
      .select('business_name, business_phone, business_email, business_address, business_city, business_state, business_logo_url, website, license_number')
      .eq('id', row.user_id)
      .single()

    return json({
      status: row.status,
      estimate: row.data,
      company: profile ?? null,
    })
  }

  // ── POST /estimate-share — accept or decline ─────────────────
  if (req.method === 'POST') {
    const { token, action, clientNote, clientSignature } = await req.json()
    if (!token || !['accept', 'decline'].includes(action)) {
      return json({ error: 'Missing token or invalid action' }, 400)
    }

    const { data: row, error } = await sb
      .from('estimates')
      .select('id, status, data, user_id')
      .eq('share_token', token)
      .single()

    if (error || !row) return json({ error: 'Estimate not found' }, 404)

    if (row.status === 'accepted' || row.status === 'declined') {
      return json({ error: 'This estimate has already been responded to' }, 409)
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined'
    const updatedData = {
      ...(row.data as Record<string, unknown>),
      ...(clientSignature ? { clientSignature, clientSignedAt: new Date().toISOString() } : {}),
      ...(clientNote ? { clientNote } : {}),
    }
    await sb.from('estimates').update({ status: newStatus, data: updatedData }).eq('id', row.id)

    // Notify contractor via email
    if (RESEND_API_KEY) {
      const est = row.data as Record<string, unknown>
      const clientName = (est?.client as Record<string, string>)?.name ?? 'Client'
      const estimateNumber = est?.estimateNumber as string ?? ''
      const totalQuote = est?.totalQuote as number ?? 0

      const { data: profile } = await sb
        .from('profiles')
        .select('business_name, business_email')
        .eq('id', row.user_id)
        .single()

      const contractorEmail = profile?.business_email
      if (contractorEmail) {
        const subject = action === 'accept'
          ? `✅ ${clientName} accepted estimate ${estimateNumber}`
          : `❌ ${clientName} declined estimate ${estimateNumber}`

        const bodyHtml = `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <h2 style="color:${action === 'accept' ? '#16a34a' : '#dc2626'}">
              ${action === 'accept' ? '✅ Estimate Accepted' : '❌ Estimate Declined'}
            </h2>
            <p><strong>${clientName}</strong> has ${action === 'accept' ? 'accepted' : 'declined'} estimate <strong>${estimateNumber}</strong>.</p>
            ${totalQuote ? `<p>Total: <strong>$${Number(totalQuote).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>` : ''}
            ${clientSignature ? `<p>Signed by: <strong>${clientSignature}</strong></p>` : ''}
            ${clientNote ? `<p>Client note: <em>${clientNote}</em></p>` : ''}
            <a href="${APP_BASE_URL}/estimator" style="display:inline-block;margin-top:16px;background:#3f36cb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
              Open in Estimator →
            </a>
          </div>
        `

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${profile?.business_name ?? 'XpertAI Estimator'} <${FROM_EMAIL}>`,
            to: [contractorEmail],
            subject,
            html: bodyHtml,
          }),
        })
      }
    }

    return json({ ok: true, status: newStatus })
  }

  return json({ error: 'Method not allowed' }, 405)
})
