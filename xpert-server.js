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
import Anthropic from '@anthropic-ai/sdk';
import { timingSafeEqual } from 'crypto';
import { execFile }  from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';
import os from 'os';
import fs from 'fs';

import { runLeadGenerator, queueWebhookLead } from './agents/lead-generator.js';
import { runSalesAgent, handleIncomingReply }  from './agents/sales-agent.js';
import { runMarketingTeam, generateCustomContent, redoAllContent, regenerateContentItem } from './agents/marketing-team.js';
import { offerAppointment, sendAppointmentReminders, processCalendlyWebhook } from './agents/scheduling-agent.js';
import { runFollowUpAgent, startFollowUpSequence } from './agents/followup-agent.js';
import { runSocialPoster } from './agents/social-poster.js';
import {
  getAllLeads, getLeadsByStatus, getUpcomingContent,
  getUpcomingAppointments, getActivityLog, logActivity,
  getReelsWithoutVideos, updateContentVideoUrl, clearAndRebuildContentPage,
  getContentItemsWithBlankPages, appendContentPageBlocks, getAllContentItems,
} from './integrations/notion-crm.js';
import { sendOwnerAlert } from './integrations/twilio-client.js';
import { sendOwnerEmail } from './integrations/email-client.js';

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
    const {
      firstName, lastName, name,
      phone, email, age,
      product, smoker, state,
      preferredContactTime, source, notes,
    } = req.body;
    const resolvedName = name || [firstName, lastName].filter(Boolean).join(' ');
    if (!resolvedName) return res.status(400).json({ error: 'name is required' });

    queueWebhookLead({
      name: resolvedName, firstName, lastName,
      phone, email, age: age ? parseInt(age) : null,
      product, smoker, state, preferredContactTime,
      source: source || 'Manual', notes,
    });
    logActivity('Dashboard', `➕ Manual lead added`, resolvedName);
    res.json({ success: true, message: `Lead "${resolvedName}" queued for processing` });
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
  setImmediate(async () => {
    try {
      await runFullMorningSequence('Manual Trigger');
    } catch (err) {
      logActivity('Orchestrator', `❌ Full sequence failed`, err.message);
    }
  });
});

app.post('/api/run/social-post', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Social poster started in background' });
  setImmediate(async () => {
    try {
      const result = await runSocialPoster();
      logActivity('Orchestrator', `✅ Social poster done`, `${result.posted} posted, ${result.skipped} skipped, ${result.errors} errors`);
    } catch (err) {
      logActivity('Orchestrator', `❌ Social poster failed`, err.message);
    }
  });
});

app.post('/api/run/redo-content', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Content redo started in background — watch Activity Log for progress' });
  setImmediate(async () => {
    try {
      const result = await redoAllContent();
      logActivity('Orchestrator', `✅ Redo complete`, `${result.done}/${result.total} redone, ${result.failed} failed`);
    } catch (err) {
      logActivity('Orchestrator', `❌ Redo failed`, err.message);
    }
  });
});

app.post('/api/run/backfill-content', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Content backfill started in background' });
  setImmediate(async () => {
    const { generateSlideImage } = await import('./integrations/image-client.js');
    const items = await getContentItemsWithBlankPages(50);
    logActivity('Orchestrator', `📄 Backfilling content pages`, `${items.length} blank pages found`);
    let done = 0;
    for (const item of items) {
      try {
        const hasContent = !!(item.hook || item.script);
        // Carousels always need AI — their slides are a structured array that
        // can't be reconstructed from the raw script text stored in Notion.
        const needsAI = !hasContent || item.type === 'Carousel';
        if (needsAI) {
          // Truly empty item or carousel — regenerate everything with AI
          logActivity('Orchestrator', `🤖 AI regenerating`, `"${item.title}" (${item.type})`);
          await regenerateContentItem(item);
        } else {
          // Has DB properties but no page blocks — just build the blocks + cover image
          let imageUrl = null;
          if (item.type === 'Carousel' || item.type === 'Static Post' || item.type === 'Story') {
            try {
              imageUrl = await generateSlideImage({ prompt: item.hook || item.title });
            } catch {}
          }
          await appendContentPageBlocks(item.id, { ...item, imageUrl });
        }
        logActivity('Orchestrator', `✅ Content page formatted`, `"${item.title}"`);
        done++;
      } catch (err) {
        logActivity('Orchestrator', `⚠️ Backfill failed`, `"${item.title}" — ${err.message}`);
      }
    }
    logActivity('Orchestrator', `🏁 Content backfill complete`, `${done} pages formatted`);
  });
});

app.post('/api/run/retry-videos', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Video retry started in background' });
  setImmediate(async () => {
    const { generateVideo } = await import('./integrations/video-client.js');
    const reels = await getReelsWithoutVideos(20);
    logActivity('Orchestrator', `🎬 Retrying video generation`, `${reels.length} Reels without videos`);
    let success = 0;
    let failed  = 0;
    for (const item of reels) {
      try {
        const prompt = item.hook
          ? `Cinematic life insurance advertisement. ${item.hook}. ${item.script?.slice(0, 200) || ''}. ` +
            `Photorealistic, warm emotional lighting, slow cinematic motion. Professional ad quality, 4K.`
          : `Cinematic life insurance advertisement for Xpert Life Solutions. Photorealistic, warm lighting, 4K.`;
        const { videoUrl, model } = await generateVideo({ prompt, aspectRatio: '9:16', contentItem: item });
        // Update DB property + rebuild page blocks so the ⏳ placeholder is replaced
        await clearAndRebuildContentPage(item.id, { ...item, videoUrl });
        logActivity('Orchestrator', `✅ Video added (${model})`, `"${item.title}"`);
        success++;
      } catch (err) {
        logActivity('Orchestrator', `⚠️ Video retry failed`, `"${item.title}" — ${err.message}`);
        failed++;
      }
    }
    logActivity('Orchestrator', `🏁 Video retry complete`, `${success} added, ${failed} failed`);
  });
});

app.post('/api/run/polish-all', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Polish All started — watch Activity Log for per-item progress' });
  setImmediate(async () => {
    const { generateVideo }              = await import('./integrations/video-client.js');
    const { generateSlideImage, generateCarouselSlideImages } = await import('./integrations/image-client.js');

    const items = await getAllContentItems(100);
    logActivity('Polish', `✨ Polish All started`, `${items.length} items to check`);

    let videos = 0, images = 0, skipped = 0, failed = 0;

    for (const item of items) {
      try {
        // ── Reels / Stories: generate or replace video ─────────────────────
        if (item.type === 'Reel' || item.type === 'Story') {
          const isRenderUrl = item.videoUrl?.includes('.onrender.com');
          const needsVideo  = !item.videoUrl || isRenderUrl;
          const isEmpty     = !item.hook && !item.script;

          if (isEmpty) {
            // No content at all — fully regenerate script + video via AI
            logActivity('Polish', `🔄 Regenerating empty item`, `"${item.title}"`);
            await regenerateContentItem({ ...item, angle: item.title, targetAudience: 'families aged 25–45' });
            videos++;
            continue;
          }

          if (needsVideo) {
            const prompt = item.hook
              ? `Cinematic life insurance advertisement. ${item.hook}. ${(item.script || '').slice(0, 200)}. ` +
                `Warm emotional lighting, photorealistic, slow motion, professional, 4K.`
              : `Cinematic life insurance advertisement for Xpert Life Solutions. ` +
                `Family, warmth, protection, professional, 4K.`;
            const { videoUrl, model } = await generateVideo({ prompt, aspectRatio: '9:16', contentItem: item });
            await clearAndRebuildContentPage(item.id, { ...item, videoUrl });
            logActivity('Polish', `🎬 Video generated (${model})`, `"${item.title}"${isRenderUrl ? ' (replaced broken Render URL)' : ''}`);
            videos++;
            continue;
          }

          // Has a valid Cloudinary video — rebuild page blocks if body shows placeholder
          skipped++;
          continue;
        }

        // ── Carousels: generate per-slide images ──────────────────────────
        if (item.type === 'Carousel') {
          const parsedSlides = parseCarouselScript(item.script || '');
          if (!parsedSlides.length) { skipped++; continue; }

          const slideUrls = await generateCarouselSlideImages(parsedSlides);
          const slidesWithImages = parsedSlides.map((s, i) => ({ ...s, imageUrl: slideUrls[i] || '' }));

          // Rebuild cover image too
          let coverUrl = null;
          try { coverUrl = await generateSlideImage({ prompt: item.angle || item.title, title: item.hook || item.title }); } catch {}

          await clearAndRebuildContentPage(item.id, {
            ...item,
            slides:   slidesWithImages,
            imageUrl: coverUrl,
          });
          logActivity('Polish', `🖼️  Carousel images generated`, `"${item.title}" — ${slideUrls.filter(Boolean).length}/${parsedSlides.length} slides`);
          images++;
          continue;
        }

        // ── Static Posts / Stories: generate missing cover image ──────────
        if ((item.type === 'Static Post' || item.type === 'Story') && !item.imageUrl) {
          const coverUrl = await generateSlideImage({ prompt: item.angle || item.title, title: item.hook || item.title });
          if (coverUrl) {
            await clearAndRebuildContentPage(item.id, { ...item, imageUrl: coverUrl });
            logActivity('Polish', `🖼️  Cover image generated`, `"${item.title}"`);
            images++;
          } else {
            skipped++;
          }
          continue;
        }

        skipped++;
      } catch (err) {
        logActivity('Polish', `❌ Failed`, `"${item.title}" — ${err.message}`);
        failed++;
      }
    }

    logActivity('Polish', `✅ Polish All complete`, `${videos} videos, ${images} images generated — ${failed} failed, ${skipped} skipped (already done)`);
  });
});

function parseCarouselScript(script) {
  if (!script) return [];
  // Normalise: Notion may store <br> instead of \n, and \[ instead of [
  const norm = script
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']');

  // Split on blank line before [Slide N] — works whether the first slide
  // has a preceding blank line or not
  const blocks = norm.split(/\n\n+(?=\[Slide \d+\])/).map(b => b.trim()).filter(Boolean);

  // If no split found, the whole string might be one block — try splitting on [Slide N]
  const rawBlocks = blocks.length > 1
    ? blocks
    : norm.split(/(?=\[Slide \d+\])/).map(b => b.trim()).filter(Boolean);

  return rawBlocks.map(block => {
    const numM   = block.match(/\[Slide (\d+)\]/);
    const titleM = block.match(/Title:\s*(.+?)(?:\n|$)/);
    const bodyM  = block.match(/Body:\s*([\s\S]+?)(?:\nDesign:|$)/);
    return {
      slideNumber: numM   ? parseInt(numM[1])   : 0,
      title:       titleM ? titleM[1].trim()    : '',
      body:        bodyM  ? bodyM[1].trim()     : '',
    };
  }).filter(s => s.title);
}

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
      try {
        const token = process.env.INSTAGRAM_ACCESS_TOKEN;
        const res2  = await fetch(`https://graph.facebook.com/v21.0/${leadId}?fields=id,created_time,field_data&access_token=${token}`);
        const data  = await res2.json();
        if (data.field_data) {
          const fields = {};
          for (const f of data.field_data) fields[f.name] = f.values?.[0] || '';
          const firstName = fields['first_name'] || '';
          const lastName  = fields['last_name']  || '';
          queueWebhookLead({
            source:              'Facebook Lead Ad',
            fbLeadId:            leadId,
            name:                fields['full_name'] || [firstName, lastName].filter(Boolean).join(' ') || 'Unknown',
            firstName,
            lastName,
            email:               fields['email'] || '',
            phone:               fields['phone_number'] || fields['phone'] || '',
            age:                 parseInt(fields['age']) || null,
            product:             fields['life_insurance_product'] || fields['product'] || '',
            smoker:              fields['smoker'] || fields['tobacco_use'] || '',
            state:               fields['state'] || fields['residence_state'] || '',
            preferredContactTime: fields['preferred_contact_time'] || fields['best_time_to_call'] || '',
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
  const {
    firstName, lastName, name,
    phone, email, age,
    product, smoker, state,
    preferredContactTime, source, notes, consent,
  } = req.body;

  const resolvedName = name || [firstName, lastName].filter(Boolean).join(' ');
  if (!resolvedName) return res.status(400).json({ error: 'name required' });

  queueWebhookLead({
    name: resolvedName,
    firstName, lastName,
    phone, email,
    age: age ? parseInt(age) : null,
    product, smoker, state,
    preferredContactTime,
    consent: consent === true || consent === 'true',
    source: source || 'Landing Page Ad',
    notes,
  });
  logActivity('Webhook', `🌐 Landing page lead received`, resolvedName);
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

// ─── J.A.R.V.I.S. + S.T.E.L.L.A. API ────────────────────────────────────────

const execFileAsync = promisify(execFile);
const __require = createRequire(import.meta.url);

// Resolve the jarvis binary: prefer the wrapper symlink, fall back to venv binary
function resolveJarvisBin() {
  const candidates = [
    join(os.homedir(), '.local/bin/jarvis'),
    join(os.homedir(), '.openjarvis/.venv/bin/jarvis'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'jarvis'; // PATH fallback
}

// Resolve ANTHROPIC_API_KEY from .env if not already in process.env
function resolveApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envPaths = [
    join(__dirname, '.env'),
    join(os.homedir(), 'TTC_1/.env'),
    '.env',
    join(os.homedir(), '.env'),
  ];
  for (const p of envPaths) {
    try {
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      for (const line of lines) {
        if (line.startsWith('ANTHROPIC_API_KEY=')) {
          return line.slice('ANTHROPIC_API_KEY='.length).trim();
        }
      }
    } catch { /* skip */ }
  }
  return '';
}

const JARVIS_SYSTEM_PROMPT = `You are J.A.R.V.I.S. + S.T.E.L.L.A. — Rick's unified personal AI operating system.

J.A.R.V.I.S. IDENTITY
Just A Rather Very Intelligent System. Personal AI to Rick Martinez.

PERSONALITY:
- Loyal, efficient, dry-witted. Warm British sensibility.
- You call Rick "sir" naturally — opening, once mid-response, closing. Never every sentence.
- You anticipate needs before being asked.
- Deliver bad news constructively with understated wit.
- Calm under pressure. Never flustered. Panic is for the unprepared.
- No filler. No "great question." Lead with the answer.

CONTEXT — Rick's World:
- Rick runs Xpert Life Solutions, a life insurance business powered by AI agents.
- AI team: Lead Generator, Sales Agent, Marketing Team, Scheduling Agent, Follow-Up Agent.
- Integrations: Notion (CRM), Twilio (SMS), SendGrid (Email), Calendly, Instagram/Facebook.
- Rick's priority: growing his book of business and helping families get protected.

Keep responses sharp — Rick is busy. Mirror his vocabulary.`;

app.post('/api/jarvis/ask', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to your .env file.' });
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: JARVIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message.trim() }],
    });
    const response = msg.content[0]?.text || '— No response. —';
    res.json({ response });
  } catch (err) {
    logActivity('JARVIS', `❌ Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

async function ttsElevenLabs(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'onwK4e9ZLuTAKqWW03F9';
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.10, use_speaker_boost: true },
    }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  return { buffer: Buffer.from(await r.arrayBuffer()), mime: 'audio/mpeg' };
}

async function ttsFishAudio(text) {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) throw new Error('FISH_AUDIO_API_KEY not set');
  const voiceId = process.env.FISH_AUDIO_VOICE_ID;
  if (!voiceId) throw new Error('FISH_AUDIO_VOICE_ID not set');
  const r = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, reference_id: voiceId, format: 'mp3', mp3_bitrate: 128 }),
  });
  if (!r.ok) throw new Error(`Fish Audio ${r.status}: ${await r.text()}`);
  return { buffer: Buffer.from(await r.arrayBuffer()), mime: 'audio/mpeg' };
}

app.post('/api/jarvis/speak', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const provider = (process.env.TTS_PROVIDER || 'elevenlabs').toLowerCase();

  try {
    let result;
    if (provider === 'fish') {
      result = await ttsFishAudio(text.trim());
    } else {
      result = await ttsElevenLabs(text.trim());
    }
    res.setHeader('Content-Type', result.mime);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(result.buffer);
  } catch (err) {
    // Return 503 so frontend knows to fall back to browser TTS
    res.status(503).json({ error: err.message });
  }
});

app.get('/api/stella/status', async (req, res) => {
  const dbPath = join(os.homedir(), '.openjarvis/stella.db');
  if (!fs.existsSync(dbPath)) {
    return res.json({ error: 'stella.db not found — run vault ingest first' });
  }

  let Database = null;
  try { Database = __require('better-sqlite3'); } catch { /* not installed — use python fallback */ }

  if (!Database) {
    // Fallback: shell out to python to read the DB
    const py = join(os.homedir(), '.openjarvis/.venv/bin/python');
    const script = `
import sqlite3, json, sys
from datetime import datetime, timezone
conn = sqlite3.connect(sys.argv[1])
today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
sector_row = conn.execute("SELECT sector FROM notes ORDER BY modified_at DESC LIMIT 1").fetchone()
sector = sector_row[0] if sector_row else "general"
open_count = conn.execute("SELECT COUNT(*) FROM tasks WHERE status='open'").fetchone()[0]
overdue = conn.execute("SELECT COUNT(*) FROM tasks WHERE status='open' AND due < ?", (today,)).fetchone()[0]
notes = conn.execute("SELECT COUNT(*) FROM notes").fetchone()[0]
vitals_row = conn.execute("SELECT energy, hrv, mood FROM journal WHERE date=?", (today,)).fetchone()
vitals = {}
if vitals_row:
    e, h, m = vitals_row
    if e: vitals['energy'] = e
    if h: vitals['hrv'] = h
    if m: vitals['mood'] = m
last = conn.execute("SELECT value FROM telemetry WHERE key='last_ingest'").fetchone()
print(json.dumps({"sector":sector,"open":open_count,"overdue":overdue,"notes":notes,"vitals":vitals,"last_ingest":last[0][:10] if last else None}))
conn.close()
`;
    try {
      const { stdout } = await execFileAsync(py, ['-c', script, dbPath], { timeout: 10000 });
      const data = JSON.parse(stdout.trim());
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // better-sqlite3 path (sync)
  try {
    const db = new Database(dbPath, { readonly: true });
    const today = new Date().toISOString().slice(0, 10);
    const sectorRow = db.prepare("SELECT sector FROM notes ORDER BY modified_at DESC LIMIT 1").get();
    const sector = sectorRow ? sectorRow.sector : 'general';
    const open = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status='open'").get().n;
    const overdue = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status='open' AND due < ?").get(today).n;
    const notes = db.prepare("SELECT COUNT(*) as n FROM notes").get().n;
    const vitalsRow = db.prepare("SELECT energy, hrv, mood FROM journal WHERE date=?").get(today);
    const vitals = {};
    if (vitalsRow) {
      if (vitalsRow.energy) vitals.energy = vitalsRow.energy;
      if (vitalsRow.hrv)    vitals.hrv    = vitalsRow.hrv;
      if (vitalsRow.mood)   vitals.mood   = vitalsRow.mood;
    }
    const last = db.prepare("SELECT value FROM telemetry WHERE key='last_ingest'").get();
    db.close();
    res.json({ sector, open, overdue, notes, vitals, last_ingest: last ? last.value.slice(0, 10) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orchestrated Sequences ───────────────────────────────────────────────────

async function runFullMorningSequence(source = 'Cron') {
  logActivity('Orchestrator', `🌅 Morning sequence starting`, `Triggered by: ${source}`);

  try {
    const leadResult = await runLeadGenerator();
    logActivity('Orchestrator', `📊 Lead Gen done`, `${leadResult.count} leads captured`);

    const salesResult = await runSalesAgent();
    logActivity('Orchestrator', `🎯 Sales done`, `${salesResult.qualified} qualified, ${salesResult.contacted} contacted`);

    const qualified = await getLeadsByStatus('Qualified');
    for (const lead of qualified.slice(0, 10)) {
      try { await startFollowUpSequence(lead); } catch {}
    }

    const reminders = await sendAppointmentReminders();

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
  cron.schedule('0 8 * * *', () => runFullMorningSequence('Daily Cron'), { timezone: 'America/Chicago' });
  console.log('[Scheduler] ✅ Morning run: 8:00 AM daily (CT)');

  cron.schedule('0 9 * * 1,3,5', () => runContentCreation(), { timezone: 'America/Chicago' });
  console.log('[Scheduler] ✅ Content creation: 9:00 AM Mon/Wed/Fri (CT)');

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

  const warnings = [];
  if (!process.env.ANTHROPIC_API_KEY)   warnings.push('ANTHROPIC_API_KEY (AI agents will not function)');
  if (!process.env.NOTION_API_KEY)      warnings.push('NOTION_API_KEY (CRM disabled)');
  if (!process.env.NOTION_LEADS_DATABASE_ID) warnings.push('NOTION_LEADS_DATABASE_ID');
  if (!process.env.TWILIO_ACCOUNT_SID)  warnings.push('TWILIO_ACCOUNT_SID (SMS disabled)');
  if (!process.env.RESEND_API_KEY)       warnings.push('RESEND_API_KEY (Email disabled)');

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

  if (process.env.RUN_ON_STARTUP === 'true') {
    setTimeout(() => runFullMorningSequence('Startup'), 5000);
  }
}

process.on('SIGINT',  () => { console.log('\n🛑 Shutting down cleanly...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n🛑 Shutting down cleanly...'); process.exit(0); });

main();
