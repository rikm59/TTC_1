'use strict';

/**
 * Sales Agent
 * Runs after lead gen each morning (and on-demand).
 * Qualifies new leads, sends personalized initial outreach,
 * and notifies the owner when a hot lead is ready to close.
 */

import { askClaude, askClaudeJSON } from '../integrations/claude-client.js';
import { getLeadsByStatus, updateLeadStatus, updateLeadScore, logActivity } from '../integrations/notion-crm.js';
import { sendSMS, sendOwnerAlert } from '../integrations/twilio-client.js';
import { sendEmail, sendOwnerEmail } from '../integrations/email-client.js';

const OWNER_NAME = process.env.OWNER_NAME || 'Rick';
const BUSINESS_NAME = 'Xpert Life Solutions';
const BOOKING_LINK = process.env.BOOKING_LINK || 'https://calendly.com/xpertlifesolutions';

// ─── Main Run ─────────────────────────────────────────────────────────────────

export async function runSalesAgent() {
  logActivity('Sales Agent', '🎯 Processing new leads');
  const newLeads = await getLeadsByStatus('New');

  if (newLeads.length === 0) {
    logActivity('Sales Agent', '😴 No new leads to process');
    return { qualified: 0, contacted: 0 };
  }

  logActivity('Sales Agent', `📋 Found ${newLeads.length} new leads to qualify`);

  let qualified = 0;
  let contacted = 0;

  for (const lead of newLeads) {
    try {
      // Re-qualify with full context
      const qualification = await qualifyLead(lead);

      if (qualification.score >= 7) {
        // Hot / qualified lead
        await updateLeadScore(lead.id, qualification.score);
        await updateLeadStatus(lead.id, 'Qualified', qualification.reasoning);
        qualified++;

        // Send personalized outreach
        const outreach = await generateOutreach(lead, qualification);
        const contacted_result = await sendOutreach(lead, outreach);
        if (contacted_result) contacted++;

        // Notify owner of hot lead
        if (qualification.score >= 9) {
          await notifyOwnerHotLead(lead, qualification);
        }

        logActivity('Sales Agent', `🔥 Qualified`, `${lead.name} — Score: ${qualification.score}/10`);
      } else {
        // Not qualified — move to nurture
        await updateLeadStatus(lead.id, 'Nurture', `Score: ${qualification.score}/10. ${qualification.reasoning}`);
        logActivity('Sales Agent', `🌱 Sent to nurture`, `${lead.name} — Score: ${qualification.score}/10`);
      }
    } catch (err) {
      logActivity('Sales Agent', `❌ Error processing lead ${lead.name}`, err.message);
    }
  }

  logActivity('Sales Agent', '🏁 Run complete', `${qualified} qualified, ${contacted} contacted`);
  return { qualified, contacted };
}

// ─── Lead Qualification ───────────────────────────────────────────────────────

async function qualifyLead(lead) {
  const SYSTEM = `You are a life insurance sales qualification expert for ${BUSINESS_NAME}.
Analyze this lead and return a JSON object with:
- score: number 1-10 (purchase likelihood)
- qualified: boolean (true if score >= 7)
- reasoning: string (2 sentences explaining the score)
- objections: array of strings (likely objections)
- bestApproach: string (recommended sales angle for this specific person)
- urgencyLevel: "High" | "Medium" | "Low"

Life insurance qualification criteria:
- Age 25-55 with family: High value
- Has contact info (phone/email): Required
- Shows clear intent: Major positive
- Business owner or self-employed: High value (key person insurance, buy-sell)
- Recent life event (new baby, marriage, home purchase): Urgent

Return valid JSON only.`;

  return askClaudeJSON(SYSTEM, JSON.stringify(lead));
}

// ─── Outreach Message Generation ─────────────────────────────────────────────

async function generateOutreach(lead, qualification) {
  const SYSTEM = `You are a friendly, professional life insurance advisor at ${BUSINESS_NAME}.
Write a SHORT, personalized first-contact message for this lead.
Do NOT be salesy or pushy. Be human, warm, and helpful.
Focus on THEIR situation, not the product.
Keep it under 160 characters for SMS.
Return a JSON object: { sms: string, emailSubject: string, emailBody: string }

Rules:
- Use their first name
- If product is provided, reference their specific interest (e.g. "Term Life", "Mortgage Protection")
- If state is provided, you can mention local coverage
- Reference why you're reaching out based on their source
- One clear, low-pressure call to action
- The email body should be 3-4 short paragraphs (plain text, no HTML)`;

  const context = {
    name:         lead.firstName || (lead.name || '').split(' ')[0] || 'there',
    source:       lead.source,
    age:          lead.age,
    product:      lead.product              || null,
    smoker:       lead.smoker               || null,
    state:        lead.state                || null,
    contactTime:  lead.preferredContactTime || null,
    bestApproach: qualification.bestApproach,
    bookingLink:  BOOKING_LINK,
    ownerName:    OWNER_NAME,
    businessName: BUSINESS_NAME,
  };

  return askClaudeJSON(SYSTEM, JSON.stringify(context));
}

async function sendOutreach(lead, outreach) {
  let sent = false;

  if (lead.phone && outreach.sms) {
    const result = await sendSMS(lead.phone, outreach.sms);
    if (result.success) sent = true;
  }

  if (lead.email && outreach.emailSubject && outreach.emailBody) {
    const result = await sendEmail({
      to: lead.email,
      subject: outreach.emailSubject,
      text: outreach.emailBody,
      html: buildEmailHTML(outreach.emailBody, (lead.name || '').split(' ')[0] || 'there'),
    });
    if (result.success) sent = true;
  }

  if (!lead.phone && !lead.email) {
    logActivity('Sales Agent', `⚠️ No contact info for ${lead.name}`, 'Cannot send outreach');
  }

  return sent;
}

function buildEmailHTML(body, firstName) {
  const paragraphs = body.split('\n').filter(p => p.trim()).map(p => `<p style="margin:0 0 16px">${p}</p>`).join('');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f7fb;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <tr><td style="background:linear-gradient(135deg,#1B2A4A,#2563EB);padding:30px 40px">
      <h1 style="color:#F59E0B;margin:0;font-size:22px;font-weight:800">Xpert Life Solutions</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Protecting Families. Building Legacies.</p>
    </td></tr>
    <tr><td style="padding:36px 40px;color:#1e293b;font-size:15px;line-height:1.7">
      ${paragraphs}
      <div style="margin-top:28px;padding:20px;background:#f0f7ff;border-radius:8px;border-left:4px solid #2563EB">
        <p style="margin:0;font-size:14px;color:#475569">Ready to get started? Book a free 15-minute call:</p>
        <a href="${BOOKING_LINK}" style="display:inline-block;margin-top:10px;padding:10px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">Schedule Your Free Consultation →</a>
      </div>
    </td></tr>
    <tr><td style="padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px">
      <p style="margin:0">${BUSINESS_NAME} · You received this because you expressed interest in life insurance.</p>
      <p style="margin:4px 0 0">Reply STOP to opt out.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Owner Hot Lead Alert ─────────────────────────────────────────────────────

async function notifyOwnerHotLead(lead, qualification) {
  const details = [
    lead.product      ? `📋 Product: ${lead.product}`               : null,
    lead.age          ? `🎂 Age: ${lead.age}`                        : null,
    lead.state        ? `📍 State: ${lead.state}`                    : null,
    lead.smoker       ? `🚬 Smoker: ${lead.smoker}`                  : null,
    lead.preferredContactTime ? `⏰ Best time: ${lead.preferredContactTime}` : null,
  ].filter(Boolean).join('\n');

  const msg = `🔥 HOT LEAD ALERT!\n\n${lead.name}\n📱 ${lead.phone || 'No phone'}\n📧 ${lead.email || 'No email'}\nScore: ${qualification.score}/10\n${details ? '\n' + details + '\n' : ''}\nApproach: ${qualification.bestApproach}\n\nCall them NOW!`;

  await sendOwnerAlert(msg);
  await sendOwnerEmail(
    `🔥 Hot Lead: ${lead.name} (${qualification.score}/10)`,
    `A highly qualified lead just came in and has been contacted.\n\n` +
    `Name: ${lead.name}\nPhone: ${lead.phone || 'N/A'}\nEmail: ${lead.email || 'N/A'}\nScore: ${qualification.score}/10\nSource: ${lead.source}\n` +
    (lead.product ? `Product Interest: ${lead.product}\n` : '') +
    (lead.age     ? `Age: ${lead.age}\n` : '') +
    (lead.state   ? `State: ${lead.state}\n` : '') +
    (lead.smoker  ? `Smoker: ${lead.smoker}\n` : '') +
    (lead.preferredContactTime ? `Best Contact Time: ${lead.preferredContactTime}\n` : '') +
    `\nRecommended Approach: ${qualification.bestApproach}\n\n` +
    `Likely Objections:\n${(qualification.objections || []).map(o => `• ${o}`).join('\n')}\n\n` +
    `This lead has already received an initial outreach message. Follow up within the next 2 hours for best conversion rates.`
  );
  logActivity('Sales Agent', `🚨 Owner notified — hot lead: ${lead.name}`);
}

// ─── Handle Incoming Reply ────────────────────────────────────────────────────

export async function handleIncomingReply(from, message) {
  logActivity('Sales Agent', `💬 Incoming reply from ${from}`, message.slice(0, 80));

  const SYSTEM = `You are a life insurance sales assistant at ${BUSINESS_NAME}.
Someone just replied to your outreach. Write a helpful, brief response that:
- Answers their question or addresses their comment
- If they're interested, offer to schedule a call: ${BOOKING_LINK}
- If they say "stop" or are unsubscribing, respond politely and confirm opt-out
Keep it under 160 characters for SMS. Be human and warm.
Reply with just the message text, nothing else.`;

  const response = await askClaude(SYSTEM, `From: ${from}\nMessage: "${message}"`);

  if (from.startsWith('+')) {
    await sendSMS(from, response);
  }

  // Notify owner of a reply
  await sendOwnerAlert(`📩 Reply from ${from}: "${message}"\n\nAI responded: "${response}"`);

  return response;
}
