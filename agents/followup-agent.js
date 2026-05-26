'use strict';

/**
 * Follow-Up Agent
 * Runs every 2 hours. Manages multi-touch follow-up sequences
 * for leads that haven't responded or booked yet.
 * Sequences: Day 1 → Day 3 → Day 7 → Day 14 → Day 30
 */

import { askClaude, askClaudeJSON } from '../integrations/claude-client.js';
import {
  getLeadsByStatus, updateLeadStatus,
  queueFollowUp, getPendingFollowUps, markFollowUpSent,
  logActivity,
} from '../integrations/notion-crm.js';
import { sendSMS } from '../integrations/twilio-client.js';
import { sendEmail } from '../integrations/email-client.js';

const BOOKING_LINK  = process.env.BOOKING_LINK  || 'https://calendly.com/xpertlifesolutions';
const OWNER_NAME    = process.env.OWNER_NAME    || 'Rick';
const BUSINESS_NAME = 'Xpert Life Solutions';

// Follow-up schedule: day offsets from initial contact
const SEQUENCE = [
  { day: 1,  label: 'Day 1 Check-In',      channel: 'SMS' },
  { day: 3,  label: 'Day 3 Value Drop',     channel: 'Email' },
  { day: 7,  label: 'Week 1 Social Proof',  channel: 'SMS' },
  { day: 14, label: 'Week 2 Urgency',       channel: 'Email' },
  { day: 30, label: 'Month 1 Final Check',  channel: 'SMS' },
];

// ─── Queue New Lead for Follow-Up ─────────────────────────────────────────────

export async function startFollowUpSequence(lead) {
  logActivity('Follow-Up Agent', `📬 Starting follow-up sequence for ${lead.name}`);

  for (const step of SEQUENCE) {
    const sendAt = new Date();
    sendAt.setDate(sendAt.getDate() + step.day);
    sendAt.setHours(10, 0, 0, 0); // 10 AM local

    const message = await generateFollowUpMessage(lead, step);

    await queueFollowUp({
      leadName:       lead.name,
      leadId:         lead.id || lead.pageId,
      phone:          lead.phone || '',
      email:          lead.email || '',
      channel:        step.channel,
      followUpNumber: SEQUENCE.indexOf(step) + 1,
      message,
      sendAt:         sendAt.toISOString(),
    });
  }

  logActivity('Follow-Up Agent', `✅ Queued ${SEQUENCE.length} follow-ups for ${lead.name}`);
}

// ─── Process Due Follow-Ups ───────────────────────────────────────────────────

export async function runFollowUpAgent() {
  logActivity('Follow-Up Agent', '⏰ Checking follow-up queue');

  const due = await getPendingFollowUps();

  if (due.length === 0) {
    logActivity('Follow-Up Agent', '😴 No follow-ups due right now');
    return { sent: 0 };
  }

  logActivity('Follow-Up Agent', `📨 Processing ${due.length} due follow-up(s)`);

  let sent = 0;

  for (const item of due) {
    try {
      const success = await deliverFollowUp(item);
      if (success) {
        await markFollowUpSent(item.id);
        sent++;
        logActivity('Follow-Up Agent', `✅ Follow-up sent`, `${item.leadName} — ${item.channel} #${item.followUpNumber}`);
      }
    } catch (err) {
      logActivity('Follow-Up Agent', `❌ Follow-up failed`, `${item.leadName}: ${err.message}`);
    }
  }

  logActivity('Follow-Up Agent', `🏁 Follow-up run complete`, `${sent} sent`);
  return { sent };
}

// ─── Deliver Follow-Up ────────────────────────────────────────────────────────

async function deliverFollowUp(item) {
  const cleanMessage = cleanMetadata(item.message);
  const firstName    = (item.leadName || '').split(' ')[0] || 'there';

  if (item.channel === 'SMS') {
    const phone = item.phone || extractPhone(item.message);
    if (!phone) {
      logActivity('Follow-Up Agent', `⚠️ No phone for SMS follow-up to ${item.leadName}`);
      return false;
    }
    const result = await sendSMS(phone, cleanMessage);
    return result.success;
  }

  if (item.channel === 'Email') {
    const email = item.email || extractEmail(item.message);
    if (!email) {
      logActivity('Follow-Up Agent', `⚠️ No email for follow-up to ${item.leadName}`);
      return false;
    }
    const subject = getEmailSubject(item.followUpNumber);
    const result = await sendEmail({
      to:      email,
      subject,
      text:    cleanMessage,
      html:    buildFollowUpEmailHTML(cleanMessage, firstName, item.followUpNumber),
    });
    return result.success;
  }

  return false;
}

// ─── Message Generation ───────────────────────────────────────────────────────

async function generateFollowUpMessage(lead, step) {
  const templates = {
    1: {
      system: `Write a friendly Day 1 check-in SMS (under 160 chars) for a life insurance prospect.
Ask if they had a chance to look into the info you sent. Low pressure.
Sign off as ${OWNER_NAME} from ${BUSINESS_NAME}.
Include their contact info at the END as metadata: [PHONE:${lead.phone}] [EMAIL:${lead.email}]`,
    },
    3: {
      system: `Write a Day 3 value email body (plain text, 150-200 words) sharing one powerful life insurance fact.
Example angle: "Did you know the average funeral costs $15,000? Here's how a $10/month policy covers it."
End with a soft CTA to book a call: ${BOOKING_LINK}
Include their email metadata at END: [EMAIL:${lead.email}]`,
    },
    7: {
      system: `Write a Week 1 SMS (under 160 chars) sharing a brief social proof story.
Example: "Just helped a mom of 3 get $500K coverage for $42/month. Want to see what you qualify for?"
Include CTA to book: ${BOOKING_LINK}
Include metadata: [PHONE:${lead.phone}] [EMAIL:${lead.email}]`,
    },
    14: {
      system: `Write a Week 2 email body (plain text, 150-200 words) with gentle urgency.
Angle: Life changes fast — getting protected now vs. waiting.
Mention that rates increase with age.
Include CTA: ${BOOKING_LINK}
Include metadata: [EMAIL:${lead.email}]`,
    },
    30: {
      system: `Write a final check-in SMS (under 160 chars). Be warm, not salesy.
"Just checking in one last time — if you're ever ready to explore coverage, I'm here."
Include metadata: [PHONE:${lead.phone}] [EMAIL:${lead.email}]`,
    },
  };

  const stepNum = SEQUENCE.indexOf(step) + 1;
  const template = templates[stepNum] || templates[1];

  const ctx = [
    `Lead name: ${lead.firstName || lead.name.split(' ')[0]}`,
    `Source: ${lead.source}`,
    lead.product ? `Product interest: ${lead.product}` : null,
    lead.age     ? `Age: ${lead.age}`                  : null,
    lead.state   ? `State: ${lead.state}`              : null,
    lead.smoker  ? `Smoker: ${lead.smoker}`            : null,
    lead.notes   ? `Notes: ${lead.notes}`              : null,
  ].filter(Boolean).join(', ');

  return askClaude(template.system, ctx);
}

function getEmailSubject(followUpNum) {
  const subjects = {
    1: 'Quick question for you',
    2: '💡 One life insurance fact that might surprise you',
    3: 'Real story: How I saved a family $400/month',
    4: 'The real cost of waiting (important)',
    5: 'One last thing from Xpert Life Solutions',
  };
  return subjects[followUpNum] || 'Checking in — Xpert Life Solutions';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanMetadata(text) {
  return (text || '').replace(/\[PHONE:[^\]]*\]/g, '').replace(/\[EMAIL:[^\]]*\]/g, '').trim();
}

function extractPhone(text) {
  const match = text.match(/\[PHONE:([^\]]+)\]/);
  return match?.[1]?.trim() || null;
}

function extractEmail(text) {
  const match = text.match(/\[EMAIL:([^\]]+)\]/);
  return match?.[1]?.trim() || null;
}

function buildFollowUpEmailHTML(text, firstName, num) {
  // Strip metadata tags before rendering
  const clean = text.replace(/\[PHONE:[^\]]*\]/g, '').replace(/\[EMAIL:[^\]]*\]/g, '').trim();
  const paras = clean.split('\n').filter(p => p.trim()).map(p =>
    `<p style="margin:0 0 14px;line-height:1.6;color:#1e293b">${p}</p>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f7fb;margin:0;padding:20px">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.07)">
    <div style="background:linear-gradient(135deg,#1B2A4A,#1e40af);padding:24px 30px">
      <h2 style="color:#F59E0B;margin:0;font-size:18px">Xpert Life Solutions</h2>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px">Protecting Families. Building Legacies.</p>
    </div>
    <div style="padding:28px 30px">
      ${paras}
      <div style="margin-top:22px;text-align:center">
        <a href="${BOOKING_LINK}" style="display:inline-block;padding:12px 28px;background:#2563EB;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">
          Book My Free Consultation
        </a>
      </div>
    </div>
    <div style="padding:16px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
      ${BUSINESS_NAME} · Reply STOP to opt out
    </div>
  </div>
</body>
</html>`;
}
