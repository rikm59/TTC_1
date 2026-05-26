'use strict';

/**
 * Unified video generation — 5-provider fallback chain:
 *
 *  1. Kie.ai     — Veo3.1 → Runway internal fallback  (paid, best quality)
 *  2. Replicate  — Wan-2.1 model                      (cheap ~$0.02–0.05/video)
 *  3. Fal.ai     — Wan-2.1 model                      (cheap ~$0.01–0.03/video)
 *  4. Luma AI    — Dream Machine                      (paid, premium fallback)
 *  5. FFmpeg     — branded motion-graphic overlay     (FREE, always available)
 *
 * Set only the keys you have — providers with no key are automatically skipped.
 * FFmpeg requires no key and always runs as the final safety net on Render.
 */

import { generateVideoAndWait as kieGenerate } from './kie-client.js';
import { execFile }  from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from 'fs';

const execFileAsync = promisify(execFile);
const __dirname     = dirname(fileURLToPath(import.meta.url));
const ROOT          = join(__dirname, '..');
const OUT_DIR       = join(ROOT, 'public', 'videos');

// ── Replicate (Wan-2.1) ───────────────────────────────────────────────────

async function generateVideoReplicate({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.REPLICATE_API_KEY;
  if (!key) throw new Error('REPLICATE_API_KEY not set');

  const MODEL    = 'wavespeedai/wan-2.1-t2v-480p';
  const ratioMap = { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1' };
  const ratio    = ratioMap[aspectRatio] || '9:16';

  // NOTE: do NOT include `duration` — it is not a valid WAN input field
  const res  = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ input: { prompt, aspect_ratio: ratio } }),
  });
  const data = await res.json();
  if (!data.id) {
    throw new Error(`Replicate submit failed (${res.status}): ${JSON.stringify(data).slice(0, 200)}`);
  }

  const id       = data.id;
  const deadline = Date.now() + timeoutMs;
  const INTERVALS = [10_000, 15_000, 20_000, 30_000, 30_000];
  let attempt = 0;

  while (Date.now() < deadline) {
    await sleep(INTERVALS[Math.min(attempt, INTERVALS.length - 1)]);

    const poll   = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const status = await poll.json();

    if (status.status === 'succeeded') {
      // output may be string or array
      const url = Array.isArray(status.output) ? status.output[0] : status.output;
      if (url) return { taskId: id, model: 'replicate-wan2.1', videoUrl: url };
      throw new Error(`Replicate succeeded but returned no URL: ${JSON.stringify(status.output)}`);
    }
    if (status.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${status.error || 'unknown error'}`);
    }
    attempt++;
  }

  throw new Error(`Replicate prediction ${id} timed out after ${Math.round(timeoutMs / 60000)} min`);
}

// ── Fal.ai (Wan-2.1) ─────────────────────────────────────────────────────

async function generateVideoFal({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set');

  const MODEL    = 'fal-ai/wan/v2.1/1.3b/text-to-video';
  const BASE_URL = `https://queue.fal.run/${MODEL}`;
  const ratioMap = { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1' };
  const ratio    = ratioMap[aspectRatio] || '9:16';

  // Submit — omit duration, let model use default
  const res  = await fetch(BASE_URL, {
    method:  'POST',
    headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, aspect_ratio: ratio }),
  });
  const data = await res.json();
  const requestId = data.request_id;
  if (!requestId) {
    throw new Error(`Fal.ai submit failed (${res.status}): ${JSON.stringify(data).slice(0, 200)}`);
  }

  const deadline = Date.now() + timeoutMs;
  const INTERVALS = [10_000, 15_000, 20_000, 30_000, 30_000];
  let attempt = 0;

  while (Date.now() < deadline) {
    await sleep(INTERVALS[Math.min(attempt, INTERVALS.length - 1)]);

    const poll   = await fetch(`https://queue.fal.run/${MODEL}/requests/${requestId}/status?logs=0`, {
      headers: { 'Authorization': `Key ${key}` },
    });
    const status = await poll.json();

    if (status.status === 'COMPLETED') {
      const result = await fetch(`https://queue.fal.run/${MODEL}/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${key}` },
      });
      const output   = await result.json();
      const videoUrl = output.video?.url
        || output.video_url
        || output.output?.video?.url
        || output.outputs?.[0]?.url;
      if (!videoUrl) throw new Error(`Fal.ai completed but returned no URL: ${JSON.stringify(output).slice(0, 200)}`);
      return { taskId: requestId, model: 'fal-wan2.1', videoUrl };
    }
    if (status.status === 'FAILED') {
      throw new Error(`Fal.ai request failed: ${JSON.stringify(status).slice(0, 200)}`);
    }
    attempt++;
  }

  throw new Error(`Fal.ai request ${requestId} timed out after ${Math.round(timeoutMs / 60000)} min`);
}

// ── Luma AI (premium paid fallback) ──────────────────────────────────────

async function generateVideoLuma({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error('LUMA_API_KEY not set');

  const res  = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, aspect_ratio: aspectRatio || '9:16' }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Luma AI generate failed (${res.status}): ${JSON.stringify(data).slice(0, 200)}`);

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
      throw new Error(`Luma AI generation failed: ${status.failure_reason || 'unknown'}`);
    }
    attempt++;
  }
  throw new Error(`Luma AI generation ${id} timed out`);
}

// ── FFmpeg branded fallback (FREE, no API key, works on Render) ───────────

async function generateVideoFFmpeg({ hook, title, brandName = 'Xpert Life Solutions' }) {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // Prune videos older than 24 h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const f of readdirSync(OUT_DIR)) {
    if (!f.endsWith('.mp4')) continue;
    try { if (statSync(join(OUT_DIR, f)).mtimeMs < cutoff) unlinkSync(join(OUT_DIR, f)); } catch {}
  }

  const filename = `ad-${Date.now()}.mp4`;
  const outPath  = join(OUT_DIR, filename);

  // Sanitise text for ffmpeg drawtext (escape colons and special chars)
  const sanitise = (s) => (s || '').replace(/[':]/g, ' ').slice(0, 60);
  const line1 = sanitise(brandName);
  const line2 = sanitise(hook || title || 'Protect Your Family Today');

  // Build a 7-second branded 1080×1920 video using only ffmpeg primitives
  // Navy background → gold header → hook text — no external fonts needed
  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x0B1F3A:size=1080x1920:rate=30`,
    '-vf', [
      // Gold accent bar top
      `drawbox=x=0:y=0:w=1080:h=12:color=0xC9A84C@1:t=fill`,
      // Gold accent bar bottom
      `drawbox=x=0:y=1908:w=1080:h=12:color=0xC9A84C@1:t=fill`,
      // Brand name (large, gold)
      `drawtext=text='${line1}':fontcolor=0xC9A84C:fontsize=56:x=(w-text_w)/2:y=200:font=DejaVu-Sans-Bold`,
      // Hook text (white, centered, wrapped)
      `drawtext=text='${line2}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2:font=DejaVu-Sans:line_spacing=10`,
      // CTA
      `drawtext=text='Get Your Free Quote Today':fontcolor=0xC9A84C:fontsize=38:x=(w-text_w)/2:y=h-280:font=DejaVu-Sans-Bold`,
    ].join(','),
    '-t', '7',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    outPath,
  ];

  try {
    await execFileAsync('ffmpeg', args, { timeout: 60_000 });
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('ffmpeg not installed on this server');
    throw new Error(`ffmpeg render failed: ${err.stderr?.slice(0, 200) || err.message}`);
  }

  const host = process.env.RENDER_EXTERNAL_URL
    || `http://localhost:${process.env.PORT || 3000}`;

  return {
    taskId:   filename,
    model:    'ffmpeg-branded',
    videoUrl: `${host}/videos/${filename}`,
  };
}

// ── Unified Fallback Chain ────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string}  opts.prompt        - AI video prompt (Kie, Replicate, Fal, Luma)
 * @param {string}  opts.aspectRatio   - e.g. '9:16'
 * @param {number}  opts.timeoutMs
 * @param {object}  [opts.contentItem] - { hook, script, title } for FFmpeg fallback
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
      name:    'FFmpeg (branded)',
      enabled: true,
      fn:      () => generateVideoFFmpeg({
        hook:      contentItem.hook || contentItem.title || 'Is Your Family Protected?',
        title:     contentItem.title,
        brandName: 'Xpert Life Solutions',
      }),
    },
  ];

  const errors = [];
  for (const provider of providers.filter(p => p.enabled)) {
    try {
      const result = await provider.fn();
      console.log(`[Video] ✅ ${provider.name}`);
      return result;
    } catch (err) {
      const msg = `${provider.name}: ${err.message}`;
      errors.push(msg);
      console.warn(`[Video] ⚠️  ${msg}`);
    }
  }

  throw new Error(`All video providers failed — ${errors.join(' | ')}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
