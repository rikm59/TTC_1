'use strict';

import sgMail from '@sendgrid/mail';

let configured = false;

function ensureConfigured() {
  if (!configured) {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) {
      console.warn('[Email] ⚠️  SENDGRID_API_KEY not set — email disabled');
      return false;
    }
    sgMail.setApiKey(key);
    configured = true;
  }
  return true;
}

export async function sendEmail({ to, subject, text, html }) {
  if (!ensureConfigured()) return { success: false, reason: 'SendGrid not configured' };

  const from = process.env.FROM_EMAIL || 'noreply@xpertlifesolutions.com';
  const fromName = process.env.FROM_NAME || 'Xpert Life Solutions';

  try {
    await sgMail.send({ to, from: { email: from, name: fromName }, subject, text, html });
    console.log(`[Email] ✅ Email sent to ${to} — "${subject}"`);
    return { success: true };
  } catch (err) {
    console.error(`[Email] ❌ Email failed to ${to}: ${err.message}`);
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
    to: ownerEmail,
    subject: `[Xpert Life AI] ${subject}`,
    text: body,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto"><h2 style="color:#1B4F72">Xpert Life Solutions — AI Alert</h2><p>${body.replace(/\n/g, '<br>')}</p><hr><small>Your AI Agent Team</small></div>`,
  });
}
