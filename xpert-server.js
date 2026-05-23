'use strict';

/**
 * Xpert Life Solutions — AI Agent Team Orchestrator
 * ─────────────────────────────────────────────────
 * Coordinates: Lead Generator · Sales Agent · Marketing Team
 *              Scheduling Agent · Follow-Up Agent
 *
 * Schedules:
 *  08:00 daily       → Lead Gen + Sales Agent
 *  09:00 Mon/Wed/Fri → Marketing Team
 *  Every 2 hours     → Follow-Up Agent + Appointment Reminders
 */

import 'dotenv/config';
import express    from 'express';
import cron       from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';
import { timingSafeEqual } from 'crypto';

import { runLeadGenerator, queueWebhookLead } from './agents/lead-generator.js';
import { runSalesAgent, handleIncomingReply }  from './agents/sales-agent.js';
import { runMarketingTeam, generateCustomContent } from './agents/marketing-team.js';
import { offerAppointment, sendAppointmentReminders, processCalendlyWebhook } from './agents/scheduling-agent.js';
import { runFollowUpAgent, startFollowUpSequence } from './agents/followup-agent.js';
import {
  getAllLeads, getLeadsByStatus, getUpcomingContent,
  getUpcomingAppointments, getActivityLog, logActivity,
} from './integrations/notion-crm.js';
import { sendOwnerAlert, sendOwnerEmail } from './integrations/twilio-client.js';

// ─── App Setup ────────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.TRIGGER_SECRET_KEY || 'change-this-secret';

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Missing x-auth-token header' });
  try {
    const a = Buffer.from(token.padEnd(256));
    const b = Buffer.from(SECRET_KEY.padEnd(256));
    if (a.length === b.length && timingSafeEqual(a, b) && token.length === SECRET_KEY.length) {
      return next();
    }
  } catch {}
  return res.status(401).json({ error: 'Invalid auth token' });
}

// ─── Dashboard Route ──────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Xpert Life Solutions AI Agent Team',
    agents: ['Lead Generator', 'Sales Agent', 'Marketing Team', 'Scheduling Agent', 'Follow-Up Agent'],
    timestamp: new Date().toISOString(),
  });
});

// ─── Dashboard API ────────────────────────────────────────────────────────────

app.get('/api/leads', async (req, res) => {
  try {
    const leads = await getAllLeads(100);
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/leads/:status', async (req, res) => {
  try {
    const leads = await getLeadsByStatus(req.params.status);
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/content', async (req, res) => {
  try {
    const content = await getUpcomingContent(20);
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await getUpcomingAppointments();
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ success: true, activity: getActivityLog(limit) });
});

app.get('/api/stats', async (req, res) => {
  try {
    const [all, newLeads, qualified, nurture, appointments] = await Promise.all([
      getAllLeads(500),
      getLeadsByStatus('New'),
      getLeadsByStatus('Qualified'),
      getLeadsByStatus('Nurture'),
      getUpcomingAppointments(),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayLeads = all.filter(l => l.createdAt?.startsWith(today));
    const appointmentSet = all.filter(l => l.status === 'Appointment Set');
    const converted = all.filter(l => l.status === 'Converted');

    res.json({
      success: true,
      stats: {
        total:          all.length,
        new:            newLeads.length,
        qualified:      qualified.length,
        nurture:        nurture.length,
        todayLeads:     todayLeads.length,
        appointmentSet: appointmentSet.length,
        converted:      converted.length,
        upcomingAppts:  appointments.length,
        pipeline: [
          { status: 'New',             count: newLeads.length      },
          { status: 'Qualified',       count: qualified.length     },
          { status: 'Nurture',         count: nurture.length       },
          { status: 'Appointment Set', count: appointmentSet.length},
          { status: 'Converted',       count: converted.length     },
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Manual Lead Add ──────────────────────────────────────────────────────────

app.post('/api/leads', async (req, res) => {
  try {
    const { name, phone, email, source, age, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    queueWebhookLead({ name, phone, email, source: source || 'Manual', age, notes });
    logActivity('Dashboard', `➕ Manual lead added`, name);
    res.json({ success: true, message: `Lead "${name}" queued for processing` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Manual Agent Triggers ────────────────────────────────────────────────────

app.post('/api/run/lead-gen', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Lead generation started in background' });
  setImmediate(async () => {
    try {
      const result = await runLeadGenerator();
      logActivity('Orchestrator', `✅ Manual lead gen complete`, `${result.count} leads`);
      await sendOwnerAlert(`✅ Manual lead gen done: ${result.count} leads captured`);
    } catch (err) {
      logActivity('Orchestrator', `❌ Manual lead gen failed`, err.message);
    }
  });
});

app.post('/api/run/sales', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Sales agent started in background' });
  setImmediate(async () => {
    try {
      const result = await runSalesAgent();
      logActivity('Orchestrator', `✅ Manual sales run complete`, `${result.qualified} qualified, ${result.contacted} contacted`);
    } catch (err) {
      logActivity('Orchestrator', `❌ Manual sales run failed`, err.message);
    }
  });
});

app.post('/api/run/marketing', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Marketing team started in background' });
  setImmediate(async () => {
    try {
      const result = await runMarketingTeam();
      logActivity('Orchestrator', `✅ Manual marketing run complete`, `${result.created} pieces`);
    } catch (err) {
      logActivity('Orchestrator', `❌ Manual marketing run failed`, err.message);
    }
  });
});

app.post('/api/run/followups', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Follow-up agent started in background' });
  setImmediate(async () => {
    try {
      const result = await runFollowUpAgent();
      logActivity('Orchestrator', `✅ Manual follow-up run complete`, `${result.sent} sent`);
    } catch (err) {
      logActivity('Orchestrator', `❌ Manual follow-up run failed`, err.message);
    }
  });
});

app.post('/api/run/all', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Full agent team started in background' });
  setImmediate(() => runFullMorningSequence('Manual Trigger'));
});

app.post('/api/content/generate', requireAuth, async (req, res) => {
  try {
    const { request } = req.body;
    if (!request) return res.status(400).json({ error: 'request is required' });
    const content = await generateCustomContent(request);
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Webhooks ─────────────────────────────────────────────────────────────────

// Facebook Lead Ads webhook verification
app.get('/webhook/facebook', (req, res) => {
  const mode  = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    logActivity('Webhook', '✅ Facebook webhook verified');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
});

// Facebook Lead Ads — real-time lead intake
app.post('/webhook/facebook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  const body = req.body;
  if (body.object !== 'page') return;

  for (const entry of (body.entry || [])) {
    for (const change of (entry.changes || [])) {
      if (change.field !== 'leadgen') continue;
      const leadId = change.value?.leadgen_id;
      if (!leadId) continue;

      logActivity('Webhook', `📘 Facebook lead received`, `ID: ${leadId}`);
      // Fetch lead data from FB API
      try {
        const token = process.env.INSTAGRAM_ACCESS_TOKEN;
        const res2  = await fetch(`https://graph.facebook.com/v21.0/${leadId}?fields=id,created_time,field_data&access_token=${token}`);
        const data  = await res2.json();
        if (data.field_data) {
          const fields = {};
          for (const f of data.field_data) fields[f.name] = f.values?.[0] || '';
          queueWebhookLead({
            source: 'Facebook Lead Ad',
            fbLeadId: leadId,
            name:  fields['full_name'] || fields['first_name'] || 'Unknown',
            email: fields['email'] || '',
            phone: fields['phone_number'] || fields['phone'] || '',
            age:   parseInt(fields['age']) || null,
          });
        }
      } catch (err) {
        logActivity('Webhook', `❌ Failed to fetch FB lead ${leadId}`, err.message);
      }
    }
  }
});

// Landing page form submission
app.post('/webhook/landing-page', (req, res) => {
  const { name, phone, email, source, age, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  queueWebhookLead({ name, phone, email, source: source || 'Landing Page', age, notes });
  logActivity('Webhook', `🌐 Landing page lead received`, name);
  res.json({ success: true });
});

// Calendly webhook
app.post('/webhook/calendly', async (req, res) => {
  res.status(200).json({ received: true });
  try {
    await processCalendlyWebhook(req.body);
  } catch (err) {
    logActivity('Webhook', `❌ Calendly webhook error`, err.message);
  }
});

// Twilio SMS incoming reply
app.post('/webhook/sms-reply', async (req, res) => {
  res.set('Content-Type', 'text/xml').send('<Response></Response>');
  const from = req.body.From;
  const body = req.body.Body;
  if (from && body) {
    setImmediate(() => handleIncomingReply(from, body));
  }
});

// Legacy trigger (keep backward compat)
app.post('/v1/trigger', requireAuth, (req, res) => {
  res.status(202).json({ success: true, message: 'Full agent sequence triggered' });
  setImmediate(() => runFullMorningSequence('Legacy Trigger'));
});

// ─── Orchestrated Sequences ───────────────────────────────────────────────────

async function runFullMorningSequence(source = 'Cron') {
  logActivity('Orchestrator', `🌅 Morning sequence starting`, `Triggered by: ${source}`);

  try {
    // Step 1: Lead Generation
    const leadResult = await runLeadGenerator();
    logActivity('Orchestrator', `📊 Lead Gen done`, `${leadResult.count} leads captured`);

    // Step 2: Sales — qualify new leads
    const salesResult = await runSalesAgent();
    logActivity('Orchestrator', `🎯 Sales done`, `${salesResult.qualified} qualified, ${salesResult.contacted} contacted`);

    // Step 3: Queue follow-ups for newly qualified leads
    const qualified = await getLeadsByStatus('Qualified');
    for (const lead of qualified.slice(0, 10)) {
      try { await startFollowUpSequence(lead); } catch {}
    }

    // Step 4: Send appointment reminders
    const reminders = await sendAppointmentReminders();

    // Step 5: Daily summary to owner
    const summary = `🌅 DAILY SUMMARY\n\n` +
      `📊 Leads today: ${leadResult.count}\n` +
      `✅ Qualified: ${salesResult.qualified}\n` +
      `📨 Contacted: ${salesResult.contacted}\n` +
      `⏰ Reminders sent: ${reminders}\n\n` +
      `Review your dashboard for details.`;

    await sendOwnerAlert(summary);
    logActivity('Orchestrator', `📊 Morning sequence complete`);

  } catch (err) {
    logActivity('Orchestrator', `❌ Morning sequence error`, err.message);
    await sendOwnerAlert(`⚠️ Morning sequence had an error: ${err.message}`);
  }
}

async function runContentCreation() {
  logActivity('Orchestrator', '🎨 Content creation day starting');
  try {
    const result = await runMarketingTeam();
    logActivity('Orchestrator', `✅ Content done`, `${result.created} pieces created`);
  } catch (err) {
    logActivity('Orchestrator', `❌ Content creation error`, err.message);
  }
}

// ─── Cron Jobs ────────────────────────────────────────────────────────────────

function startScheduledJobs() {
  // 8:00 AM daily — Lead Gen + Sales
  cron.schedule('0 8 * * *', () => runFullMorningSequence('Daily Cron'), { timezone: 'America/Chicago' });
  console.log('[Scheduler] ✅ Morning run: 8:00 AM daily (CT)');

  // 9:00 AM Mon/Wed/Fri — Marketing Team
  cron.schedule('0 9 * * 1,3,5', () => runContentCreation(), { timezone: 'America/Chicago' });
  console.log('[Scheduler] ✅ Content creation: 9:00 AM Mon/Wed/Fri (CT)');

  // Every 2 hours — Follow-Ups + Reminders
  cron.schedule('0 */2 * * *', async () => {
    await runFollowUpAgent();
    await sendAppointmentReminders();
  }, { timezone: 'America/Chicago' });
  console.log('[Scheduler] ✅ Follow-up checks: every 2 hours (CT)');
}

// ─── Startup ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🤖 ═══════════════════════════════════════════════════');
  console.log('   XPERT LIFE SOLUTIONS — AI AGENT TEAM');
  console.log('   Lead Gen · Sales · Marketing · Scheduling · Follow-Up');
  console.log('═══════════════════════════════════════════════════════\n');

  // Validate critical env vars
  const warnings = [];
  if (!process.env.ANTHROPIC_API_KEY)   warnings.push('ANTHROPIC_API_KEY (AI agents will not function)');
  if (!process.env.NOTION_API_KEY)      warnings.push('NOTION_API_KEY (CRM disabled)');
  if (!process.env.NOTION_LEADS_DATABASE_ID) warnings.push('NOTION_LEADS_DATABASE_ID');
  if (!process.env.TWILIO_ACCOUNT_SID)  warnings.push('TWILIO_ACCOUNT_SID (SMS disabled)');
  if (!process.env.SENDGRID_API_KEY)    warnings.push('SENDGRID_API_KEY (Email disabled)');

  if (warnings.length) {
    console.warn('[Startup] ⚠️  Missing env vars (some features disabled):');
    warnings.forEach(w => console.warn(`  • ${w}`));
  }

  startScheduledJobs();

  app.listen(PORT, () => {
    console.log(`\n[Server] 🚀 Dashboard live → http://localhost:${PORT}`);
    console.log(`[Server] 🔗 Health check  → http://localhost:${PORT}/health`);
    console.log(`[Server] 🎯 Leads API     → http://localhost:${PORT}/api/leads`);
    logActivity('Orchestrator', '🚀 Xpert Life Solutions AI Agent Team started');
  });

  // Run immediately on startup if env says to
  if (process.env.RUN_ON_STARTUP === 'true') {
    setTimeout(() => runFullMorningSequence('Startup'), 5000);
  }
}

process.on('SIGINT',  () => { console.log('\n🛑 Shutting down cleanly...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n🛑 Shutting down cleanly...'); process.exit(0); });

main();
