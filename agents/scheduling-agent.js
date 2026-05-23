'use strict';

/**
 * Scheduling Agent
 * Sends appointment booking links to qualified leads.
 * Confirms bookings, reminds both parties, and notifies the owner.
 */

import { askClaude } from '../integrations/claude-client.js';
import { createAppointment, getUpcomingAppointments, logActivity } from '../integrations/notion-crm.js';
import { sendSMS, sendOwnerAlert } from '../integrations/twilio-client.js';
import { sendEmail, sendOwnerEmail } from '../integrations/email-client.js';

const BOOKING_LINK = process.env.BOOKING_LINK || 'https://calendly.com/xpertlifesolutions';
const OWNER_NAME   = process.env.OWNER_NAME   || 'Rick';
const BUSINESS_NAME = 'Xpert Life Solutions';

// ─── Offer Appointment ────────────────────────────────────────────────────────

export async function offerAppointment(lead) {
  logActivity('Scheduling Agent', `📅 Offering appointment to ${lead.name}`);

  const SYSTEM = `You are a scheduling assistant for ${BUSINESS_NAME}.
Write a warm, brief message offering a FREE 15-minute life insurance consultation.
Include the booking link: ${BOOKING_LINK}
Be friendly and low-pressure. Under 160 characters for SMS.
Return ONLY the message text.`;

  const smsMsg = await askClaude(SYSTEM,
    `Lead name: ${lead.name.split(' ')[0]}, Source: ${lead.source}, Notes: ${lead.notes}`
  );

  const emailSubject = `Your Free Life Insurance Consultation — ${BUSINESS_NAME}`;
  const emailBody = await buildAppointmentEmail(lead);

  if (lead.phone) await sendSMS(lead.phone, smsMsg);
  if (lead.email) await sendEmail({ to: lead.email, subject: emailSubject, text: emailBody, html: wrapEmailHTML(emailBody) });

  logActivity('Scheduling Agent', `📨 Appointment offer sent to ${lead.name}`);
}

async function buildAppointmentEmail(lead) {
  return `Hi ${lead.name.split(' ')[0]},

Thank you for your interest in protecting your family with life insurance!

I'd love to schedule a FREE 15-minute consultation where I can:
• Answer all your questions about coverage options
• Show you how much coverage you can get for your budget
• Help you find the RIGHT policy for your family's specific needs

No obligation, no pressure — just a simple conversation to see if I can help.

Book your free consultation here:
${BOOKING_LINK}

Talk soon,
${OWNER_NAME}
${BUSINESS_NAME}

P.S. Most clients are surprised by how affordable life insurance actually is. Let me show you!`;
}

// ─── Confirm Appointment ──────────────────────────────────────────────────────

export async function confirmAppointment(data) {
  const { name, phone, email, datetime, notes } = data;
  logActivity('Scheduling Agent', `✅ Appointment confirmed`, `${name} — ${datetime}`);

  // Save to Notion
  await createAppointment({ name, phone, email, datetime, status: 'Confirmed', notes: notes || '' });

  // Confirm to lead
  if (phone) {
    await sendSMS(phone,
      `Confirmed! Your free life insurance consultation with ${OWNER_NAME} is set for ${formatDateTime(datetime)}. ` +
      `Reply to this message if you need to reschedule. See you soon! — ${BUSINESS_NAME}`
    );
  }
  if (email) {
    await sendEmail({
      to: email,
      subject: `Appointment Confirmed — ${formatDateTime(datetime)}`,
      text: buildConfirmationEmail(name.split(' ')[0], datetime),
      html: wrapEmailHTML(buildConfirmationEmail(name.split(' ')[0], datetime)),
    });
  }

  // Notify owner
  await sendOwnerAlert(
    `📅 NEW APPOINTMENT BOOKED!\n\n👤 ${name}\n📱 ${phone || 'No phone'}\n📧 ${email || 'No email'}\n🗓️ ${formatDateTime(datetime)}\n\nReview your calendar and prepare!`
  );

  await sendOwnerEmail(
    `📅 Appointment Booked: ${name}`,
    `A new appointment has been booked!\n\n` +
    `Client: ${name}\nPhone: ${phone || 'N/A'}\nEmail: ${email || 'N/A'}\nDate/Time: ${formatDateTime(datetime)}\n` +
    `Notes: ${notes || 'None'}\n\n` +
    `Tip: Review their lead notes before the call for the best chance at closing.`
  );
}

function buildConfirmationEmail(firstName, datetime) {
  return `Hi ${firstName},

Your appointment is confirmed! Here are the details:

📅 Date & Time: ${formatDateTime(datetime)}
📞 Format: Phone call (we'll call you)

To prepare for our call, think about:
• How many people depend on your income?
• Do you have any existing life insurance?
• What monthly budget feels comfortable?

No need to gather paperwork — we'll figure everything out together.

If you need to reschedule, please reply to this email or call us directly.

Looking forward to speaking with you!

${OWNER_NAME}
${BUSINESS_NAME}`;
}

// ─── Appointment Reminders ────────────────────────────────────────────────────

export async function sendAppointmentReminders() {
  const appointments = await getUpcomingAppointments();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const nextDay = new Date(tomorrow);
  nextDay.setDate(nextDay.getDate() + 1);

  let sent = 0;

  for (const appt of appointments) {
    const apptDate = new Date(appt.datetime);
    if (apptDate >= tomorrow && apptDate < nextDay) {
      // 24-hour reminder
      if (appt.phone) {
        await sendSMS(appt.phone,
          `Reminder: Your free life insurance consultation with ${OWNER_NAME} is TOMORROW at ${formatTime(appt.datetime)}. ` +
          `Reply YES to confirm or RESCHEDULE to change. — ${BUSINESS_NAME}`
        );
      }
      logActivity('Scheduling Agent', `⏰ Reminder sent`, `${appt.name} — ${formatDateTime(appt.datetime)}`);
      sent++;
    }
  }

  if (sent > 0) {
    await sendOwnerAlert(`⏰ Sent ${sent} appointment reminder(s) for tomorrow.`);
  }

  return sent;
}

// ─── Process Calendly Webhook ─────────────────────────────────────────────────

export async function processCalendlyWebhook(payload) {
  if (payload.event !== 'invitee.created') return;

  const invitee = payload.payload?.invitee;
  const event   = payload.payload?.event;

  if (!invitee || !event) return;

  await confirmAppointment({
    name:     invitee.name,
    email:    invitee.email,
    phone:    invitee.text_reminder_number || '',
    datetime: event.start_time,
    notes:    `Booked via Calendly — ${event.name}`,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return iso; }
}

function wrapEmailHTML(text) {
  const paragraphs = text.split('\n').filter(p => p.trim()).map(p => `<p style="margin:0 0 14px;line-height:1.6">${p}</p>`).join('');
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#1e293b">
    <div style="background:#1B2A4A;padding:20px 30px;border-radius:8px 8px 0 0">
      <h2 style="color:#F59E0B;margin:0;font-size:20px">Xpert Life Solutions</h2>
    </div>
    <div style="padding:30px;background:#fff;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
      ${paragraphs}
      <div style="margin-top:24px;padding:16px;background:#f0f9ff;border-radius:6px;text-align:center">
        <a href="${BOOKING_LINK}" style="color:#2563EB;font-weight:bold;font-size:15px">📅 Book or Reschedule Your Appointment</a>
      </div>
    </div>
  </div>`;
}
