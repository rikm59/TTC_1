'use strict';

/**
 * Unified video generation — 5-provider fallback chain:
 *
 *  1. Kie.ai     — Veo3.1 → Runway internal fallback  (paid, best quality)
 *  2. Replicate  — Wan-2.1 model                      (cheap ~$0.02–0.05/video, free credits)
 *  3. Fal.ai     — Wan-2.1 model                      (cheap ~$0.01–0.03/video, free credits)
 *  4. Luma AI    — Dream Machine                      (paid, premium fallback)
 *  5. Remotion   — React template renderer            (FREE, no API key, always available)
 *
 * Set only the keys you have — providers with no key are automatically skipped.
 * Remotion requires no key and always runs as the final safety net.
 */

import { generateVideoAndWait as kieGenerate } from './kie-client.js';

// Remotion is an optional dependency — load it dynamically so a missing
// install never crashes the server or fails the fallback chain.
async function tryRemotion(opts) {
  const { generateVideoRemotion } = await import('./remotion-client.js');
  return generateVideoRemotion(opts);
}

// ── Replicate (Wan-2.1 — best cheap option) ───────────────────────────────

async function generateVideoReplicate({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.REPLICATE_API_KEY;
  if (!key) throw new Error('REPLICATE_API_KEY not set');

  // Wan-2.1 480p — ~$0.02–0.05 per video, excellent quality
  const MODEL = 'wavespeedai/wan-2.1-t2v-480p';

  const ratioMap = { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1' };
  const ratio = ratioMap[aspectRatio] || '9:16';

  const res  = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ input: { prompt, aspect_ratio: ratio, duration: 5 } }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Replicate generate failed: ${JSON.stringify(data)}`);

  const id       = data.id;
  const deadline = Date.now() + timeoutMs;
  const INTERVALS = [10_000, 10_000, 15_000, 20_000, 30_000];
  let attempt = 0;

  while (Date.now() < deadline) {
    await sleep(INTERVALS[Math.min(attempt, INTERVALS.length - 1)]);

    const poll   = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const status = await poll.json();

    if (status.status === 'succeeded' && status.output?.[0]) {
      return { taskId: id, model: 'replicate-wan2.1', videoUrl: status.output[0] };
    }
    if (status.status === 'failed') {
      throw new Error(`Replicate prediction ${id} failed: ${status.error || 'unknown'}`);
    }
    attempt++;
  }

  throw new Error(`Replicate prediction ${id} timed out`);
}

// ── Fal.ai (Wan-2.1 — second cheap option) ────────────────────────────────

async function generateVideoFal({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set');

  const MODEL    = 'fal-ai/wan/v2.1/1.3b/text-to-video';
  const BASE_URL = `https://queue.fal.run/${MODEL}`;

  const ratioMap = { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1' };
  const ratio = ratioMap[aspectRatio] || '9:16';

  // Submit job
  const res  = await fetch(BASE_URL, {
    method:  'POST',
    headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, aspect_ratio: ratio, duration: '5' }),
  });
  const data = await res.json();
  const requestId = data.request_id;
  if (!requestId) throw new Error(`Fal.ai submit failed: ${JSON.stringify(data)}`);

  const deadline = Date.now() + timeoutMs;
  const INTERVALS = [10_000, 10_000, 15_000, 20_000, 30_000];
  let attempt = 0;

  while (Date.now() < deadline) {
    await sleep(INTERVALS[Math.min(attempt, INTERVALS.length - 1)]);

    const poll   = await fetch(`https://queue.fal.run/${MODEL}/requests/${requestId}/status?logs=0`, {
      headers: { 'Authorization': `Key ${key}` },
    });
    const status = await poll.json();

    if (status.status === 'COMPLETED') {
      // Fetch the actual result
      const result = await fetch(`https://queue.fal.run/${MODEL}/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${key}` },
      });
      const output = await result.json();
      const videoUrl = output.video?.url || output.video_url || output.output?.video?.url;
      if (!videoUrl) throw new Error('Fal.ai returned no video URL');
      return { taskId: requestId, model: 'fal-wan2.1', videoUrl };
    }
    if (status.status === 'FAILED') {
      throw new Error(`Fal.ai request ${requestId} failed`);
    }
    attempt++;
  }

  throw new Error(`Fal.ai request ${requestId} timed out`);
}

// ── Luma AI (premium paid fallback) ───────────────────────────────────────

async function generateVideoLuma({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error('LUMA_API_KEY not set');

  const res  = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, aspect_ratio: aspectRatio || '9:16' }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Luma AI generate failed: ${JSON.stringify(data)}`);

  const id       = data.id;
  const deadline = Date.now() + timeoutMs;
  const INTERVALS = [15_000, 15_000, 30_000, 30_000, 60_000];
  let attempt = 0;

  while (Date.now() < deadline) {
    await sleep(INTERVALS[Math.min(attempt, INTERVALS.length - 1)]);

    const poll   = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${id}`, {
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

// ── Unified Fallback Chain ─────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string}  opts.prompt        - AI video prompt (used by Kie.ai, Replicate, Fal.ai, Luma)
 * @param {string}  opts.aspectRatio   - e.g. '9:16'
 * @param {number}  opts.timeoutMs
 * @param {object}  [opts.contentItem] - Passed to Remotion for template rendering
 *                                       { hook, script, title, angle }
 */
export async function generateVideo({ prompt, aspectRatio = '9:16', timeoutMs = 600_000, contentItem = {} }) {
  const providers = [
    {
      name:    'Kie.ai (Veo3→Runway)',
      enabled: !!process.env.KIE_API_KEY,
      fn:      () => kieGenerate({ prompt, aspectRatio, timeoutMs }),
    },
    {
      name:    'Replicate (Wan-2.1)',
      enabled: !!process.env.REPLICATE_API_KEY,
      fn:      () => generateVideoReplicate({ prompt, aspectRatio, timeoutMs }),
    },
    {
      name:    'Fal.ai (Wan-2.1)',
      enabled: !!process.env.FAL_API_KEY,
      fn:      () => generateVideoFal({ prompt, aspectRatio, timeoutMs }),
    },
    {
      name:    'Luma AI',
      enabled: !!process.env.LUMA_API_KEY,
      fn:      () => generateVideoLuma({ prompt, aspectRatio, timeoutMs }),
    },
    {
      // Remotion always attempts — no API key required; skips gracefully if packages aren't installed
      name:    'Remotion (template)',
      enabled: true,
      fn:      () => tryRemotion({
        hook:      contentItem.hook  || contentItem.title || 'Is Your Family Protected?',
        body:      contentItem.script?.slice(0, 200) || contentItem.angle || 'Life insurance protects everything you work for.',
        cta:       'Get Your Free Quote Today',
        brandName: 'Xpert Life Solutions',
      }),
    },
  ];

  for (const provider of providers.filter(p => p.enabled)) {
    try {
      const result = await provider.fn();
      if (provider.name !== 'Kie.ai (Veo3→Runway)') {
        console.warn(`[Video] ✅ ${provider.name} used as fallback`);
      }
      return result;
    } catch (err) {
      console.warn(`[Video] ⚠️  ${provider.name} failed (${err.message}) — trying next`);
    }
  }

  throw new Error('All video providers failed — including Remotion. Check server logs.');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
