'use strict';

import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import { timingSafeEqual } from 'crypto';

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.TRIGGER_SECRET_KEY || 'default-super-secret-key';
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

// Helper function to execute the main engine script safely
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
  // Health check endpoint for monitoring platforms
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', agents: 'active' });
  });

  // Secure API Trigger Endpoint
  app.post('/v1/trigger', (req, res) => {
    const clientToken = req.headers['x-auth-token'];

    if (!clientToken || !tokenMatches(clientToken)) {
      console.warn('[Webhook Agent] 🔒 Unauthorized trigger attempt blocked.');
      return res.status(401).json({ error: 'Unauthorized access token provided.' });
    }

    // Decouple execution so the request returns instantly
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
function main() {
  console.log('🤖 Starting Instagram Saves Engine Multi-Agent Orchestration Framework...');

  // Initial safety sync on startup
  executeSyncEngine('System Startup Check');

  startSchedulerAgent();
  startWebhookAgent();
}

// Graceful application shutdown management
function shutdown(signal) {
  console.log(`\n🛑 ${signal} received. Stopping agents cleanly...`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main();
