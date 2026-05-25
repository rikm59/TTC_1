'use strict';

/**
 * Unified video generation with 4-provider fallback chain:
 * Kie.ai Veo3 → Kie.ai Runway → Luma AI → Runway ML direct
 */

import { generateVideoAndWait as kieGenerate } from './kie-client.js';

// ── Luma AI Dream Machine ──────────────────────────────────────────────────

const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1/generations';

async function generateVideoLuma({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error('LUMA_API_KEY not set');

  // Map 9:16 → portrait aspect ratio Luma understands
  const ratioMap = { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1', '4:3': '4:3', '3:4': '3:4' };
  const ratio = ratioMap[aspectRatio] || '9:16';

  const res  = await fetch(LUMA_BASE, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, aspect_ratio: ratio }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Luma AI generate failed: ${JSON.stringify(data)}`);

  const id       = data.id;
  const deadline = Date.now() + timeoutMs;
  const INTERVALS = [15_000, 15_000, 30_000, 30_000, 60_000];
  let attempt = 0;

  while (Date.now() < deadline) {
    await sleep(INTERVALS[Math.min(attempt, INTERVALS.length - 1)]);

    const poll  = await fetch(`${LUMA_BASE}/${id}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const status = await poll.json();

    if (status.state === 'completed' && status.assets?.video) {
      return { taskId: id, model: 'luma', videoUrl: status.assets.video };
    }
    if (status.state === 'failed') {
      throw new Error(`Luma AI generation ${id} failed: ${status.failure_reason || 'unknown'}`);
    }
    attempt++;
  }

  throw new Error(`Luma AI generation ${id} timed out`);
}

// ── Runway ML Direct ───────────────────────────────────────────────────────

const RUNWAY_TASKS_URL = 'https://api.runwayml.com/v1/text_to_video';
const RUNWAY_STATUS    = (id) => `https://api.runwayml.com/v1/tasks/${id}`;

async function generateVideoRunway({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.RUNWAY_API_KEY;
  if (!key) throw new Error('RUNWAY_API_KEY not set');

  // Runway uses width×height, not ratio strings
  const dimensionMap = {
    '9:16':  { width: 720,  height: 1280 },
    '16:9':  { width: 1280, height: 720  },
    '1:1':   { width: 1024, height: 1024 },
  };
  const dims = dimensionMap[aspectRatio] || dimensionMap['9:16'];

  const res  = await fetch(RUNWAY_TASKS_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      promptText: prompt,
      model:      'gen4_turbo',
      duration:   10,
      ratio:      `${dims.width}:${dims.height}`,
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Runway ML generate failed: ${JSON.stringify(data)}`);

  const id       = data.id;
  const deadline = Date.now() + timeoutMs;
  const INTERVALS = [15_000, 15_000, 30_000, 30_000, 60_000];
  let attempt = 0;

  while (Date.now() < deadline) {
    await sleep(INTERVALS[Math.min(attempt, INTERVALS.length - 1)]);

    const poll   = await fetch(RUNWAY_STATUS(id), {
      headers: { 'Authorization': `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' },
    });
    const status = await poll.json();

    if (status.status === 'SUCCEEDED' && status.output?.[0]) {
      return { taskId: id, model: 'runway-direct', videoUrl: status.output[0] };
    }
    if (status.status === 'FAILED') {
      throw new Error(`Runway ML task ${id} failed: ${status.failure || 'unknown'}`);
    }
    attempt++;
  }

  throw new Error(`Runway ML task ${id} timed out`);
}

// ── Unified Fallback Chain ─────────────────────────────────────────────────

export async function generateVideo({ prompt, aspectRatio = '9:16', timeoutMs = 600_000 }) {
  const providers = [
    {
      name: 'Kie.ai (Veo3→Runway)',
      enabled: !!process.env.KIE_API_KEY,
      fn: () => kieGenerate({ prompt, aspectRatio, timeoutMs }),
    },
    {
      name: 'Luma AI',
      enabled: !!process.env.LUMA_API_KEY,
      fn: () => generateVideoLuma({ prompt, aspectRatio, timeoutMs }),
    },
    {
      name: 'Runway ML',
      enabled: !!process.env.RUNWAY_API_KEY,
      fn: () => generateVideoRunway({ prompt, aspectRatio, timeoutMs }),
    },
  ];

  const available = providers.filter(p => p.enabled);
  if (available.length === 0) throw new Error('No video providers configured. Add KIE_API_KEY, LUMA_API_KEY, or RUNWAY_API_KEY.');

  for (const provider of available) {
    try {
      const result = await provider.fn();
      if (provider.name !== 'Kie.ai (Veo3→Runway)') {
        console.warn(`[Video] ✅ ${provider.name} responded (fallback used)`);
      }
      return result;
    } catch (err) {
      console.warn(`[Video] ⚠️  ${provider.name} failed (${err.message}) — trying next`);
    }
  }

  throw new Error('All video providers failed. Check API keys and credits in Render.');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
