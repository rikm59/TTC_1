'use strict';

/**
 * Email via Resend (resend.com) — free tier: 3,000 emails/month, 100/day.
 * Sign up at resend.com → API Keys → create key → set RESEND_API_KEY in Render.
 * Verify your sending domain (xpertlifesolutions.com) in Resend dashboard.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

function normalizeAddress(to) {
  if (typeof to === 'string') return to;
  return to?.email || to?.address || String(to);
}

export async function sendEmail({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[Email] ⚠️  RESEND_API_KEY not set — email disabled');
    return { success: false, reason: 'Resend not configured' };
  }

  const from      = `${process.env.FROM_NAME || 'Rick @ Xpert Life Solutions'} <${process.env.FROM_EMAIL || 'rmartin@xpertlifesolutions.com'}>`;
  const toAddress = normalizeAddress(to);
  const htmlBody  = html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`;

  try {
    const res = await fetch(RESEND_API_URL, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: toAddress, subject, html: htmlBody }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

    console.log(`[Email] ✅ Sent to ${toAddress} — "${subject}" (id: ${data.id})`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error(`[Email] ❌ Failed to ${toAddress}: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

export async function sendOwnerEmail(subject, body) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    console.log(`[Owner Email] 📧 ${subject}: ${body}`);
    return;
  }
  return sendEmail({
    to:      ownerEmail,
    subject: `[Xpert Life AI] ${subject}`,
    text:    body,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">
        <h2 style="color:#1B4F72;border-bottom:2px solid #C9A84C;padding-bottom:8px">
          Xpert Life Solutions — AI Alert
        </h2>
        <p style="line-height:1.6">${body.replace(/\n/g, '<br>')}</p>
        <hr style="border:none;border-top:1px solid #eee;margin-top:20px">
        <small style="color:#999">Your Xpert Life AI Agent Team</small>
      </div>`,
  });
}
