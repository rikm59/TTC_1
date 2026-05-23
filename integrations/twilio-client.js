'use strict';

import twilio from 'twilio';

let twilioClient = null;

function getClient() {
  if (!twilioClient) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      console.warn('[Twilio] ⚠️  TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — SMS disabled');
      return null;
    }
    twilioClient = twilio(sid, token);
  }
  return twilioClient;
}

export async function sendSMS(to, body) {
  const client = getClient();
  if (!client) return { success: false, reason: 'Twilio not configured' };

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) return { success: false, reason: 'TWILIO_PHONE_NUMBER not set' };

  try {
    const msg = await client.messages.create({ body, from, to });
    console.log(`[Twilio] ✅ SMS sent to ${to} — SID: ${msg.sid}`);
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error(`[Twilio] ❌ SMS failed to ${to}: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

export async function sendOwnerAlert(message) {
  const ownerPhone = process.env.OWNER_PHONE_NUMBER;
  if (!ownerPhone) {
    console.log(`[Owner Alert] 📱 ${message}`);
    return;
  }
  return sendSMS(ownerPhone, `[Xpert Life AI] ${message}`);
}
