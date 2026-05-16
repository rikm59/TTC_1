'use strict';

import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import { timingSafeEqual } from 'crypto';

const app = express();
app.use(bodyParser.json());

const PORT       = process.env.PORT || 3000;
const SECRET_KEY = process.env.TRIGGER_SECRET_KEY || 'default-super-secret-key';
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Token refresh — exchange any token for a fresh 60-day long-lived token.
// Also works on existing long-lived tokens (Meta allows re-exchange after 24h).
// If FB_APP_ID / FB_APP_SECRET are not set, skip silently and use token as-is.
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

    // Update in-process env so all child engine processes inherit the fresh token
    process.env.INSTAGRAM_ACCESS_TOKEN = body.access_token;
    const days = body.expires_in ? Math.round(body.expires_in / 86400) : '?';
    console.log(`[Token Refresh] ✅ Token refreshed — valid for ~${days} days`);
  } catch (err) {
    console.warn('[Token Refresh] ⚠️ Exchange request failed:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Engine runner
// ---------------------------------------------------------------------------
function executeSyncEngine(source) {
  console.log(`\n[Agent Controller] 🚀 Initializing sync execution triggered by: [${source}]`);

  exec('node engine.js', (error, stdout, stderr) => {
    if (stdout) console.log(`[Agent Controller] 🏁 Engine output from [${source}]:\n`, stdout);
    if (stderr) console.warn(`[Agent Controller] ⚠️ Engine warnings from [${source}]:`, stderr);
    if (error)  console.error(`[Agent Controller] ❌ Execution Error from [${source}]:`, error.message);
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

// =========================================================================
// AGENT 1: The Scheduled Sync Worker (Interval Loop)
// =========================================================================
function startSchedulerAgent() {
  console.log('[Scheduler Agent] ⏳ Background timer initiated. Target schedule: Every 12 hours.');

  setInterval(() => {
    executeSyncEngine('Automated Cron Scheduler');
  }, TWELVE_HOURS);
}

// =========================================================================
// AGENT 2: The Webhook Listener Agent (Instant Trigger)
// =========================================================================
function startWebhookAgent() {
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', agents: 'active' });
  });

  app.post('/v1/trigger', (req, res) => {
    const clientToken = req.headers['x-auth-token'];

    if (!clientToken || !tokenMatches(clientToken)) {
      console.warn('[Webhook Agent] 🔒 Unauthorized trigger attempt blocked.');
      return res.status(401).json({ error: 'Unauthorized access token provided.' });
    }

    executeSyncEngine('Manual Webhook Trigger');

    return res.status(202).json({
      success: true,
      message: 'Synchronization request accepted. Sync processing in background.',
    });
  });

  app.listen(PORT, () => {
    console.log(`[Webhook Agent] 🌐 Secure trigger endpoint live on port :${PORT}`);
  });
}

// =========================================================================
// SYSTEM ORCHESTRATION STARTUP
// =========================================================================
async function main() {
  console.log('🤖 Starting Instagram Saves Engine Multi-Agent Orchestration Framework...');

  // Refresh token before first sync — child processes inherit the updated env
  await refreshAccessToken();

  executeSyncEngine('System Startup Check');
  startSchedulerAgent();
  startWebhookAgent();
}

function shutdown(signal) {
  console.log(`\n🛑 ${signal} received. Stopping agents cleanly...`);
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main();
