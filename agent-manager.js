'use strict';

const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ENGINE_SCRIPT = path.resolve(__dirname, 'engine.js');
const CRON_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const WEBHOOK_PORT = 3000;
const TRIGGER_SECRET_KEY = process.env.TRIGGER_SECRET_KEY;

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

// ---------------------------------------------------------------------------
// Structured logger
// ---------------------------------------------------------------------------

function timestamp() {
  return new Date().toISOString();
}

function log(level, agent, message) {
  const color = { INFO: CYAN, WARN: YELLOW, ERROR: RED, SUCCESS: GREEN, SYS: MAGENTA }[level] || RESET;
  process.stdout.write(
    `${DIM}[${timestamp()}]${RESET} ${color}${BOLD}[${level}]${RESET} ${BOLD}[${agent}]${RESET} ${message}\n`
  );
}

// ---------------------------------------------------------------------------
// Engine runner — shared by both agents
// ---------------------------------------------------------------------------

function spawnEngine(trigger) {
  log('INFO', 'EngineRunner', `Spawning engine.js — trigger="${trigger}"`);

  const child = spawn(process.execPath, [ENGINE_SCRIPT], {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  const pid = child.pid;
  log('SUCCESS', 'EngineRunner', `engine.js started  pid=${pid}`);

  child.stdout.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    lines.forEach((line) => log('INFO', `engine[${pid}]`, line));
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    lines.forEach((line) => log('WARN', `engine[${pid}]`, line));
  });

  child.on('error', (err) => {
    log('ERROR', 'EngineRunner', `Failed to start engine.js — ${err.message}`);
  });

  child.on('close', (code, signal) => {
    if (code === 0) {
      log('SUCCESS', 'EngineRunner', `engine.js[${pid}] exited cleanly (code=0)`);
    } else if (signal) {
      log('WARN', 'EngineRunner', `engine.js[${pid}] killed by signal ${signal}`);
    } else {
      log('ERROR', 'EngineRunner', `engine.js[${pid}] exited with error code ${code}`);
    }
  });

  return child;
}

// ---------------------------------------------------------------------------
// Agent 1 — Cron Scheduler
// ---------------------------------------------------------------------------

let cronTimer = null;

function startCronAgent() {
  log('SYS', 'CronAgent', `Initialising — interval=${CRON_INTERVAL_MS / 3600000}h`);

  function tick() {
    log('INFO', 'CronAgent', 'Scheduled tick fired');
    try {
      spawnEngine('cron');
    } catch (err) {
      log('ERROR', 'CronAgent', `Unexpected error launching engine — ${err.message}`);
    }
  }

  // Fire immediately on startup so the first run doesn't wait 12 h.
  tick();

  cronTimer = setInterval(tick, CRON_INTERVAL_MS);
  cronTimer.unref(); // Do not keep the event loop alive solely for this timer.

  log('SUCCESS', 'CronAgent', 'Cron scheduler is active');
}

function stopCronAgent() {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
    log('SYS', 'CronAgent', 'Cron scheduler stopped');
  }
}

// ---------------------------------------------------------------------------
// Agent 2 — Webhook Listener
// ---------------------------------------------------------------------------

let webhookServer = null;

function startWebhookAgent() {
  if (!TRIGGER_SECRET_KEY) {
    log('ERROR', 'WebhookAgent', 'TRIGGER_SECRET_KEY is not set — webhook endpoint will reject all requests');
  }

  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  // -------------------------------------------------------------------
  // Security middleware — constant-time token comparison to resist
  // timing-based attacks.
  // -------------------------------------------------------------------
  function authGuard(req, res, next) {
    const provided = req.headers['x-auth-token'];

    if (!TRIGGER_SECRET_KEY) {
      log('ERROR', 'WebhookAgent', `401 — TRIGGER_SECRET_KEY not configured`);
      return res.status(401).json({ error: 'Server misconfiguration: auth secret not set' });
    }

    if (!provided) {
      log('WARN', 'WebhookAgent', `401 — Missing X-Auth-Token header  ip=${req.ip}`);
      return res.status(401).json({ error: 'Missing X-Auth-Token header' });
    }

    // Constant-time comparison to avoid timing attacks.
    const a = Buffer.from(provided.padEnd(128));
    const b = Buffer.from(TRIGGER_SECRET_KEY.padEnd(128));
    const match = a.length === b.length && require('crypto').timingSafeEqual(a, b);

    if (!match) {
      log('WARN', 'WebhookAgent', `403 — Invalid token  ip=${req.ip}`);
      return res.status(403).json({ error: 'Forbidden: invalid token' });
    }

    next();
  }

  // -------------------------------------------------------------------
  // POST /v1/trigger
  // -------------------------------------------------------------------
  app.post('/v1/trigger', authGuard, (req, res) => {
    const requestId = `req-${Date.now()}`;
    log('INFO', 'WebhookAgent', `Trigger received  id=${requestId}  ip=${req.ip}`);

    // Respond immediately so the caller is not blocked on engine runtime.
    res.status(202).json({
      status: 'accepted',
      message: 'engine.js dispatched as background process',
      requestId,
    });

    // Decouple: let the response flush before spawning.
    setImmediate(() => {
      try {
        spawnEngine(`webhook:${requestId}`);
      } catch (err) {
        log('ERROR', 'WebhookAgent', `Engine spawn failed after 202  id=${requestId}  err=${err.message}`);
      }
    });
  });

  // -------------------------------------------------------------------
  // Health check (unauthenticated — useful for load-balancer probes)
  // -------------------------------------------------------------------
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  // -------------------------------------------------------------------
  // Catch-all 404
  // -------------------------------------------------------------------
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // -------------------------------------------------------------------
  // Global error handler
  // -------------------------------------------------------------------
  app.use((err, req, res, _next) => {
    log('ERROR', 'WebhookAgent', `Unhandled express error — ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  });

  webhookServer = app.listen(WEBHOOK_PORT, () => {
    log('SUCCESS', 'WebhookAgent', `Listening on port ${WEBHOOK_PORT}  endpoint=POST /v1/trigger`);
  });

  webhookServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log('ERROR', 'WebhookAgent', `Port ${WEBHOOK_PORT} already in use — cannot start webhook server`);
    } else {
      log('ERROR', 'WebhookAgent', `Server error — ${err.message}`);
    }
    process.exitCode = 1;
  });
}

function stopWebhookAgent(callback) {
  if (webhookServer) {
    webhookServer.close(() => {
      log('SYS', 'WebhookAgent', 'HTTP server closed');
      if (callback) callback();
    });
  } else if (callback) {
    callback();
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  log('SYS', 'AgentManager', `${signal} received — initiating graceful shutdown`);

  stopCronAgent();

  stopWebhookAgent(() => {
    log('SYS', 'AgentManager', 'All agents stopped — process exiting');
    process.exit(0);
  });

  // Force-exit if graceful shutdown takes too long.
  setTimeout(() => {
    log('ERROR', 'AgentManager', 'Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 8000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  log('ERROR', 'AgentManager', `Uncaught exception — ${err.message}`);
  log('ERROR', 'AgentManager', err.stack || '(no stack)');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  log('ERROR', 'AgentManager', `Unhandled promise rejection — ${msg}`);
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

(function bootstrap() {
  log('SYS', 'AgentManager', '========================================');
  log('SYS', 'AgentManager', '  Instagram→Notion Orchestration Layer  ');
  log('SYS', 'AgentManager', '========================================');
  log('SYS', 'AgentManager', `Node ${process.version}  pid=${process.pid}`);

  startCronAgent();
  startWebhookAgent();

  log('SYS', 'AgentManager', 'Bootstrap complete — all agents running');
})();
