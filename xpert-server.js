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
import { timingSafeEqual, createHmac } from 'crypto';

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
import twilio from 'twilio';

// ─── App Setup ────────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.TRIGGER_SECRET_KEY;
if (!SECRET_KEY) {
  console.error('FATAL: TRIGGER_SECRET_KEY env var must be set');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// Capture raw body for Facebook webhook HMAC verification (must run before json parser)
app.use('/webhook/facebook', (req, res, next) => {
  if (req.method !== 'POST') return next();
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    req.rawBody = Buffer.from(raw, 'utf8');
    try { req.body = JSON.parse(raw); } catch { req.body = {}; }
    next();
  });
});

// Simple in-memory rate limiter for public lead intake endpoints (per IP, 20 req/min)
const _rateBuckets = new Map();
function rateLimit(req, res, next) {
  const ip  = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = _rateBuckets.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + 60_000; }
  bucket.count++;
  _rateBuckets.set(ip, bucket);
  if (bucket.count > 20) return res.status(429).json({ error: 'Too many requests' });
  next();
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
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

app.get('/api/leads', requireAuth, async (req, res) => {
  try {
    const leads = await getAllLeads(100);
    res.json({ success: true, leads });
  } catch (err) {
    console.error('[API] GET /api/leads', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/leads/:status', requireAuth, async (req, res) => {
  try {
    const leads = await getLeadsByStatus(req.params.status);
    res.json({ success: true, leads });
  } catch (err) {
    console.error('[API] GET /api/leads/:status', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/content', requireAuth, async (req, res) => {
  try {
    const content = await getUpcomingContent(20);
    res.json({ success: true, content });
  } catch (err) {
    console.error('[API] GET /api/content', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/appointments', requireAuth, async (req, res) => {
  try {
    const appointments = await getUpcomingAppointments();
    res.json({ success: true, appointments });
  } catch (err) {
    console.error('[API] GET /api/appointments', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/activity', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ success: true, activity: getActivityLog(limit) });
});

app.get('/api/stats', requireAuth, async (req, res) => {
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
    console.error('[API] GET /api/stats', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Manual Lead Add ──────────────────────────────────────────────────────────

app.post('/api/leads', rateLimit, async (req, res) => {
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
    console.error('[API] POST /api/leads', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
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
    const { cloudinaryConfigured }       = await import('./integrations/cloudinary-client.js');

    if (!cloudinaryConfigured()) {
      logActivity('Polish', `⚠️  Cloudinary not configured`, `Media URLs will be ephemeral Render URLs — set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET env vars`);
    }

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
          const { slides: parsedSlides, caption, ctaSlideText, coverSubtitle } = parseCarouselScript(item.script || '');
          if (!parsedSlides.length) { skipped++; continue; }

          const slideUrls = await generateCarouselSlideImages(parsedSlides);
          const slidesWithImages = parsedSlides.map((s, i) => ({ ...s, imageUrl: slideUrls[i] || '' }));

          // Rebuild cover image too
          let coverUrl = null;
          try { coverUrl = await generateSlideImage({ prompt: item.angle || item.title, title: item.hook || item.title }); } catch {}

          await clearAndRebuildContentPage(item.id, {
            ...item,
            slides:        slidesWithImages,
            imageUrl:      coverUrl,
            caption:       caption       || item.caption,
            ctaSlideText:  ctaSlideText  || item.ctaSlideText,
            coverSubtitle: coverSubtitle || item.coverSubtitle,
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
  if (!script) return { slides: [], caption: '', ctaSlideText: '', coverSubtitle: '' };

  const norm = script
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']');

  // Extract metadata sections appended by buildFullContent
  const captionM       = norm.match(/\[Caption\]\n([\s\S]+?)(?=\n\n\[|$)/);
  const ctaM           = norm.match(/\[CTA\]\n([\s\S]+?)(?=\n\n\[|$)/);
  const coverSubtitleM = norm.match(/\[CoverSubtitle\]\n([\s\S]+?)(?=\n\n\[|$)/);

  const caption       = captionM       ? captionM[1].trim()       : '';
  const ctaSlideText  = ctaM           ? ctaM[1].trim()           : '';
  const coverSubtitle = coverSubtitleM ? coverSubtitleM[1].trim() : '';

  // Strip metadata sections so they don't bleed into slide parsing
  const slidePart = norm.replace(/\n\n\[(Caption|CTA|CoverSubtitle)\][\s\S]+?(?=\n\n\[Slide |\n\n\[Caption|\n\n\[CTA|\n\n\[CoverSubtitle|$)/g, '');

  const blocks = slidePart.split(/\n\n+(?=\[Slide \d+\])/).map(b => b.trim()).filter(Boolean);

  const rawBlocks = blocks.length > 1
    ? blocks
    : slidePart.split(/(?=\[Slide \d+\])/).map(b => b.trim()).filter(Boolean);

  const slides = rawBlocks.map(block => {
    const numM   = block.match(/\[Slide (\d+)\]/);
    const titleM = block.match(/Title:\s*(.+?)(?:\n|$)/);
    const bodyM  = block.match(/Body:\s*([\s\S]+?)(?:\nDesign:|$)/);
    return {
      slideNumber: numM   ? parseInt(numM[1])   : 0,
      title:       titleM ? titleM[1].trim()    : '',
      body:        bodyM  ? bodyM[1].trim()     : '',
    };
  }).filter(s => s.title);

  return { slides, caption, ctaSlideText, coverSubtitle };
}

app.post('/api/content/generate', requireAuth, async (req, res) => {
  try {
    const { request } = req.body;
    if (!request) return res.status(400).json({ error: 'request is required' });
    const content = await generateCustomContent(request);
    res.json({ success: true, content });
  } catch (err) {
    console.error('[API] POST /api/content/generate', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Webhooks ─────────────────────────────────────────────────────────────────

// Facebook Lead Ads webhook verification
app.get('/webhook/facebook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) return res.status(403).send('Forbidden');

  // Timing-safe comparison to prevent oracle attacks
  const tokenMatches = (() => {
    try {
      const a = Buffer.from(String(token   || '').padEnd(256));
      const b = Buffer.from(String(verifyToken).padEnd(256));
      return a.length === b.length && timingSafeEqual(a, b) && String(token).length === verifyToken.length;
    } catch { return false; }
  })();

  if (mode === 'subscribe' && tokenMatches && /^[a-zA-Z0-9_-]+$/.test(challenge || '')) {
    logActivity('Webhook', '✅ Facebook webhook verified');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
});

// Facebook Lead Ads — real-time lead intake
app.post('/webhook/facebook', async (req, res) => {
  // Verify HMAC-SHA256 signature
  const appSecret = process.env.FB_APP_SECRET;
  if (appSecret && req.rawBody) {
    const sig      = req.headers['x-hub-signature-256'] || '';
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
    const sigBuf   = Buffer.from(sig.padEnd(256));
    const expBuf   = Buffer.from(expected.padEnd(256));
    const valid    = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf) && sig.length === expected.length;
    if (!valid) {
      logActivity('Webhook', '⚠️  Facebook webhook signature invalid — ignored');
      return res.status(403).send('Forbidden');
    }
  }

  res.status(200).send('EVENT_RECEIVED');
  const body = req.body;
  if (body.object !== 'page') return;

  for (const entry of (body.entry || [])) {
    for (const change of (entry.changes || [])) {
      if (change.field !== 'leadgen') continue;
      const leadId = change.value?.leadgen_id;
      if (!leadId || !/^\d+$/.test(String(leadId))) {
        logActivity('Webhook', '⚠️  Invalid leadgen_id — skipped', String(leadId || '').slice(0, 40));
        continue;
      }

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
app.post('/webhook/landing-page', rateLimit, (req, res) => {
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

// Calendly webhook — verify HMAC-SHA256 if signing key is configured
app.post('/webhook/calendly', async (req, res) => {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const header = req.headers['calendly-webhook-signature'] || '';
    const [tPart, v1Part] = header.split(',');
    const t  = tPart?.split('=')[1];
    const v1 = v1Part?.split('=')[1];
    if (!t || !v1) return res.status(403).send('Forbidden');
    const expected = createHmac('sha256', signingKey).update(`${t}.${JSON.stringify(req.body)}`).digest('hex');
    const expBuf   = Buffer.from(expected.padEnd(256));
    const v1Buf    = Buffer.from(v1.padEnd(256));
    const valid    = expBuf.length === v1Buf.length && timingSafeEqual(expBuf, v1Buf) && expected.length === v1.length;
    if (!valid) {
      logActivity('Webhook', '⚠️  Calendly webhook signature invalid — ignored');
      return res.status(403).send('Forbidden');
    }
  }
  res.status(200).json({ received: true });
  try {
    await processCalendlyWebhook(req.body);
  } catch (err) {
    logActivity('Webhook', `❌ Calendly webhook error`, err.message);
  }
});

// Twilio SMS incoming reply — verify Twilio request signature
app.post('/webhook/sms-reply', async (req, res) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const sig = req.headers['x-twilio-signature'] || '';
    const url = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/webhook/sms-reply`;
    const valid = twilio.validateRequest(authToken, sig, url, req.body);
    if (!valid) {
      logActivity('Webhook', '⚠️  Twilio SMS signature invalid — ignored');
      return res.set('Content-Type', 'text/xml').send('<Response></Response>');
    }
  }
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
