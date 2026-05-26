'use strict';

/**
 * Email via Twilio Communications API (comms.twilio.com/v1/Emails)
 * Uses existing TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN — no SendGrid key needed.
 *
 * Note: FROM_EMAIL must be a verified sender or verified domain in Twilio Console
 * → Email → Sender Authentication before emails will deliver.
 */

const TWILIO_EMAIL_URL = 'https://comms.twilio.com/v1/Emails';

function getAuthHeader() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
}

function normalizeAddress(to) {
  if (typeof to === 'string') return to;
  return to?.email || to?.address || String(to);
}

export async function sendEmail({ to, subject, text, html }) {
  const auth = getAuthHeader();
  if (!auth) {
    console.warn('[Email] ⚠️  TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — email disabled');
    return { success: false, reason: 'Twilio credentials not configured' };
  }

  const fromAddress = process.env.FROM_EMAIL || 'rick@xpertlifesolutions.com';
  const fromName    = process.env.FROM_NAME  || 'Rick @ Xpert Life Solutions';
  const toAddress   = normalizeAddress(to);
  const htmlBody    = html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`;

  try {
    const res = await fetch(TWILIO_EMAIL_URL, {
      method:  'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    { address: fromAddress, name: fromName },
        to:      [{ address: toAddress }],
        content: { subject, html: htmlBody },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    console.log(`[Email] ✅ Sent to ${toAddress} — "${subject}"`);
    return { success: true };
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
