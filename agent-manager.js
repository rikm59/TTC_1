'use strict';

import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import { timingSafeEqual } from 'crypto';
import { run as runTikTokAgent, logFollowerCount, generateHashtagStrategy } from './tiktok-growth-agent.js';

const app = express();
app.use(bodyParser.json());

const PORT          = process.env.PORT || 3000;
const SECRET_KEY    = process.env.TRIGGER_SECRET_KEY || 'default-super-secret-key';
const TWELVE_HOURS  = 12 * 60 * 60 * 1000;
const ONE_WEEK_MS   = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Token refresh — exchange any token for a fresh 60-day long-lived token.
// ---------------------------------------------------------------------------
async function refreshAccessToken() {
  const appId     = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const token     = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!appId || !appSecret || !token) {
    console.log('[Token Refresh] Skipping — FB_APP_ID or FB_APP_SECRET not set.');
    return;
  }

  try {
    const url = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`;
    const res  = await fetch(url);
    const body = await res.json();

    if (!res.ok || !body.access_token) {
      console.warn('[Token Refresh] ⚠️ Could not exchange token:', body.error?.message ?? JSON.stringify(body));
      return;
    }

    process.env.INSTAGRAM_ACCESS_TOKEN = body.access_token;
    const days = body.expires_in ? Math.round(body.expires_in / 86400) : '?';
    console.log(`[Token Refresh] ✅ Token refreshed — valid for ~${days} days`);
  } catch (err) {
    console.warn('[Token Refresh] ⚠️ Exchange request failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Instagram engine runner
// ---------------------------------------------------------------------------
function executeInstagramSync(source) {
  console.log(`\n[Instagram Agent] 🚀 Sync triggered by: [${source}]`);

  exec('node engine.js', (error, stdout, stderr) => {
    if (stdout) console.log(`[Instagram Agent] 🏁 Output from [${source}]:\n`, stdout);
    if (stderr) console.warn(`[Instagram Agent] ⚠️ Warnings from [${source}]:`, stderr);
    if (error)  console.error(`[Instagram Agent] ❌ Error from [${source}]:`, error.message);
  });
}

// Constant-time token comparison — prevents timing-based secret enumeration.
function tokenMatches(provided) {
  try {
    const a = Buffer.from(provided.padEnd(256));
    const b = Buffer.from(SECRET_KEY.padEnd(256));
    return a.length === b.length && timingSafeEqual(a, b) && provided.length === SECRET_KEY.length;
  } catch {
    return false;
  }
}

function authMiddleware(req, res, next) {
  const clientToken = req.headers['x-auth-token'];
  if (!clientToken || !tokenMatches(clientToken)) {
    console.warn(`[Auth] 🔒 Unauthorized request blocked: ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized access token provided.' });
  }
  next();
}

// =========================================================================
// AGENT 1: Instagram Scheduled Sync Worker
// =========================================================================
function startInstagramSchedulerAgent() {
  console.log('[Instagram Scheduler] ⏳ Background timer started — sync every 12 hours.');

  setInterval(() => {
    executeInstagramSync('Automated Cron Scheduler');
  }, TWELVE_HOURS);
}

// =========================================================================
// AGENT 2: TikTok Weekly Content Scheduler
// Generates a fresh 7-day content calendar every Monday at midnight UTC
// =========================================================================
function startTikTokSchedulerAgent() {
  console.log('[TikTok Scheduler] ⏳ Weekly content generation scheduled (Mondays).');

  function msUntilNextMonday() {
    const now  = new Date();
    const day  = now.getUTCDay(); // 0=Sun, 1=Mon
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(6, 0, 0, 0); // 6 AM UTC = 1 AM CST (midnight-ish)
    return nextMonday - now;
  }

  const delay = msUntilNextMonday();
  const daysUntil = Math.round(delay / (1000 * 60 * 60 * 24));
  console.log(`[TikTok Scheduler] Next auto-generation in ~${daysUntil} day(s).`);

  setTimeout(function scheduleWeekly() {
    runTikTokAgent({ includeHashtags: false }).catch(err => {
      console.error('[TikTok Scheduler] ❌ Weekly generation failed:', err.message);
    });
    setInterval(() => {
      runTikTokAgent({ includeHashtags: false }).catch(err => {
        console.error('[TikTok Scheduler] ❌ Weekly generation failed:', err.message);
      });
    }, ONE_WEEK_MS);
  }, delay);
}

// =========================================================================
// AGENT 3: Webhook Listener — HTTP endpoints for all agents
// =========================================================================
function startWebhookAgent() {
  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      agents: ['instagram-sync', 'tiktok-content', 'tiktok-tracker'],
      tiktokGoal: '18,000 followers',
    });
  });

  // ── Instagram ──────────────────────────────────────────────────────────────
  app.post('/v1/trigger', authMiddleware, (req, res) => {
    executeInstagramSync('Manual Webhook Trigger');
    return res.status(202).json({
      success: true,
      message: 'Instagram sync accepted — processing in background.',
    });
  });

  // ── TikTok: Generate content calendar ─────────────────────────────────────
  // POST /v1/tiktok/generate
  // Body (all optional):
  //   { "currentFollowers": 1200, "includeHashtags": true, "notes": "..." }
  app.post('/v1/tiktok/generate', authMiddleware, (req, res) => {
    const { currentFollowers, includeHashtags = false, notes = '' } = req.body ?? {};

    res.status(202).json({
      success: true,
      message: 'TikTok content generation started — check Notion in ~60 seconds.',
    });

    runTikTokAgent({
      currentFollowers: currentFollowers ?? null,
      followerNotes:    notes,
      includeHashtags,
    }).catch(err => {
      console.error('[TikTok Webhook] ❌ Content generation failed:', err.message);
    });
  });

  // ── TikTok: Log follower count ─────────────────────────────────────────────
  // POST /v1/tiktok/log-followers
  // Body: { "followers": 1450, "notes": "After posting kitchen reveal" }
  app.post('/v1/tiktok/log-followers', authMiddleware, async (req, res) => {
    const { followers, notes = '' } = req.body ?? {};

    if (!followers || typeof followers !== 'number' || followers < 0) {
      return res.status(400).json({ error: 'Provide a valid "followers" number in the request body.' });
    }

    try {
      const { Client } = await import('@notionhq/client');
      const notion = new Client({ auth: process.env.NOTION_API_KEY });
      const result = await logFollowerCount(notion, followers, notes);

      return res.status(200).json({
        success: true,
        currentFollowers: result.currentFollowers,
        goal: result.goal,
        progressPercent: result.progress,
        remainingToGoal: result.remaining,
        weeklyGrowth:    result.weeklyGrowth,
        estimatedWeeksToGoal: result.weeksToGoal,
      });
    } catch (err) {
      console.error('[Tracker Webhook] ❌ Failed to log followers:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── TikTok: Hashtag strategy refresh ──────────────────────────────────────
  // POST /v1/tiktok/hashtags
  app.post('/v1/tiktok/hashtags', authMiddleware, (req, res) => {
    res.status(202).json({
      success: true,
      message: 'Hashtag strategy generation started — check Notion in ~30 seconds.',
    });

    runTikTokAgent({ skipContent: true, includeHashtags: true }).catch(err => {
      console.error('[Hashtag Webhook] ❌ Failed:', err.message);
    });
  });

  app.listen(PORT, () => {
    console.log(`[Webhook Agent] 🌐 Endpoints live on port :${PORT}`);
    console.log(`  GET  /health`);
    console.log(`  POST /v1/trigger              — Instagram sync`);
    console.log(`  POST /v1/tiktok/generate      — Generate weekly TikTok content`);
    console.log(`  POST /v1/tiktok/log-followers — Log follower count toward 18k goal`);
    console.log(`  POST /v1/tiktok/hashtags      — Refresh hashtag strategy`);
  });
}

// =========================================================================
// SYSTEM ORCHESTRATION STARTUP
// =========================================================================
async function main() {
  console.log('🤖 TexTop Choice Multi-Agent Orchestration Framework starting...');
  console.log('   Agents: Instagram Sync | TikTok Growth | Follower Tracker\n');

  await refreshAccessToken();

  // Instagram: run once on startup, then every 12h
  executeInstagramSync('System Startup');

  // TikTok: generate first content calendar on startup if env vars present
  if (process.env.ANTHROPIC_API_KEY && process.env.NOTION_TIKTOK_CONTENT_DATABASE_ID) {
    console.log('[TikTok Agent] Running initial content generation on startup...');
    runTikTokAgent({ includeHashtags: true }).catch(err => {
      console.error('[TikTok Agent] ❌ Startup generation failed:', err.message);
    });
  } else {
    console.log('[TikTok Agent] ⚠️  Skipping startup — ANTHROPIC_API_KEY or NOTION_TIKTOK_CONTENT_DATABASE_ID not set.');
  }

  startInstagramSchedulerAgent();
  startTikTokSchedulerAgent();
  startWebhookAgent();
}

function shutdown(signal) {
  console.log(`\n🛑 ${signal} received. Stopping agents cleanly...`);
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main();
