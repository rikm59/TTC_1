'use strict';

/**
 * Video generation — AI B-roll footage + ffmpeg text overlay.
 *
 * Pipeline:
 *  1. Kie.ai     — Veo3.1 (best quality AI footage)
 *  2. Replicate  — Wan-2.1 T2V 480p
 *  3. Fal.ai     — Wan-2.1 T2V
 *  4. FFmpeg     — pure branded text-card (no AI, always works)
 *
 * For providers 1-3: after getting the AI footage URL, the video is
 * downloaded and the hook + brand are composited on top via ffmpeg,
 * producing a ready-to-post Reel with both visuals and message.
 */

import { generateVideoAndWait as kieGenerate } from './kie-client.js';
import { uploadMedia } from './cloudinary-client.js';
import { execFile }    from 'child_process';
import { promisify }   from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync, writeFileSync } from 'fs';

const execFileAsync = promisify(execFile);
const __dirname     = dirname(fileURLToPath(import.meta.url));
const ROOT          = join(__dirname, '..');
const OUT_DIR       = join(ROOT, 'public', 'videos');

// ── Replicate (Wan-2.1) ───────────────────────────────────────────────────

async function getFootageReplicate({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.REPLICATE_API_KEY;
  if (!key) throw new Error('REPLICATE_API_KEY not set');

  const MODEL    = 'wavespeedai/wan-2.1-t2v-480p';
  const ratioMap = { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1' };
  const ratio    = ratioMap[aspectRatio] || '9:16';

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
      const url = Array.isArray(status.output) ? status.output[0] : status.output;
      if (url) return url;
      throw new Error(`Replicate succeeded but returned no URL`);
    }
    if (status.status === 'failed') {
      throw new Error(`Replicate failed: ${status.error || 'unknown'}`);
    }
    attempt++;
  }
  throw new Error(`Replicate timed out after ${Math.round(timeoutMs / 60000)} min`);
}

// ── Fal.ai (Wan-2.1) ─────────────────────────────────────────────────────

async function getFootageFal({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set');

  const MODEL    = 'fal-ai/wan/v2.1/1.3b/text-to-video';
  const BASE_URL = `https://queue.fal.run/${MODEL}`;
  const ratioMap = { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1' };
  const ratio    = ratioMap[aspectRatio] || '9:16';

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
      const videoUrl = output.video?.url || output.video_url
        || output.output?.video?.url || output.outputs?.[0]?.url;
      if (!videoUrl) throw new Error(`Fal.ai completed but no URL: ${JSON.stringify(output).slice(0, 200)}`);
      return videoUrl;
    }
    if (status.status === 'FAILED') {
      throw new Error(`Fal.ai failed: ${JSON.stringify(status).slice(0, 200)}`);
    }
    attempt++;
  }
  throw new Error(`Fal.ai timed out after ${Math.round(timeoutMs / 60000)} min`);
}

// ── Luma AI ───────────────────────────────────────────────────────────────

async function getFootageLuma({ prompt, aspectRatio, timeoutMs }) {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error('LUMA_API_KEY not set');

  const res  = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, aspect_ratio: aspectRatio || '9:16' }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Luma failed (${res.status}): ${JSON.stringify(data).slice(0, 200)}`);

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
    if (status.state === 'completed' && status.assets?.video) return status.assets.video;
    if (status.state === 'failed') throw new Error(`Luma failed: ${status.failure_reason || 'unknown'}`);
    attempt++;
  }
  throw new Error(`Luma timed out`);
}

// ── Text overlay compositor (ffmpeg) ─────────────────────────────────────

function wrapText(text, maxCharsPerLine = 28) {
  const words = (text || '').split(' ');
  const lines = [];
  let line    = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxCharsPerLine && line) {
      lines.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines.slice(0, 4); // max 4 lines
}

function ffSafe(text) {
  // Escape ffmpeg drawtext special chars
  return (text || '').replace(/[\\':]/g, ' ').replace(/[[\]{}()<>]/g, '').slice(0, 120);
}

async function downloadVideo(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Download failed (${res.status}) from ${url}`);
  const buf = await res.arrayBuffer();
  writeFileSync(dest, Buffer.from(buf));
}

async function compositeOverlay({ inputPath, outPath, hook, brandName, cta }) {
  const brand     = ffSafe(brandName);
  const hookLines = wrapText(hook || '', 28);
  const ctaText   = ffSafe(cta || 'Book Your Free Consultation Today');

  // Stack drawtext filters for each hook line, centered vertically in a box
  const baseY = 760 + (4 - hookLines.length) * 40; // center vertically
  const hookFilters = hookLines.map((line, i) =>
    `drawtext=text='${ffSafe(line)}':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=${baseY + i * 90}:font=DejaVu-Sans-Bold:shadowcolor=black:shadowx=3:shadowy=3`
  ).join(',');

  const filterGraph = [
    // Scale/pad AI footage to 1080×1920 portrait with navy letterbox
    `scale=1080:1920:force_original_aspect_ratio=decrease`,
    `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0B1F3A`,
    // Semi-transparent darkening strip behind hook text
    `drawbox=x=0:y=${baseY - 30}:w=1080:h=${hookLines.length * 90 + 60}:color=black@0.55:t=fill`,
    // Hook text lines
    hookFilters,
    // Top brand bar
    `drawbox=x=0:y=0:w=1080:h=90:color=0x0B1F3A@0.85:t=fill`,
    `drawtext=text='${brand}':fontcolor=0xC9A84C:fontsize=40:x=(w-text_w)/2:y=25:font=DejaVu-Sans-Bold`,
    // Bottom CTA bar
    `drawbox=x=0:y=1830:w=1080:h=90:color=0xC9A84C@0.92:t=fill`,
    `drawtext=text='${ctaText}':fontcolor=0x0B1F3A:fontsize=34:x=(w-text_w)/2:y=1850:font=DejaVu-Sans-Bold`,
    // Gold accent lines
    `drawbox=x=0:y=88:w=1080:h=4:color=0xC9A84C:t=fill`,
    `drawbox=x=0:y=1828:w=1080:h=4:color=0x0B1F3A:t=fill`,
  ].join(',');

  const args = [
    '-y', '-i', inputPath,
    '-vf', filterGraph,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outPath,
  ];

  try {
    await execFileAsync('ffmpeg', args, { timeout: 120_000 });
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('ffmpeg not installed on this server');
    throw new Error(`ffmpeg overlay failed: ${(err.stderr || err.message).slice(0, 300)}`);
  }
}

// ── Pure ffmpeg text-card fallback (no AI footage needed) ─────────────────

async function generateTextCard({ outPath, hook, brandName, cta }) {
  const brand     = ffSafe(brandName);
  const hookLines = wrapText(hook || '', 28);
  const ctaText   = ffSafe(cta || 'Book Your Free Consultation Today');
  const baseY     = 760 + (4 - hookLines.length) * 40;

  const hookFilters = hookLines.map((line, i) =>
    `drawtext=text='${ffSafe(line)}':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=${baseY + i * 90}:font=DejaVu-Sans-Bold`
  ).join(',');

  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x0B1F3A:size=1080x1920:rate=30`,
    '-vf', [
      `drawbox=x=0:y=0:w=1080:h=12:color=0xC9A84C:t=fill`,
      `drawbox=x=0:y=1908:w=1080:h=12:color=0xC9A84C:t=fill`,
      `drawtext=text='${brand}':fontcolor=0xC9A84C:fontsize=46:x=(w-text_w)/2:y=200:font=DejaVu-Sans-Bold`,
      hookFilters,
      `drawtext=text='${ctaText}':fontcolor=0xC9A84C:fontsize=38:x=(w-text_w)/2:y=1800:font=DejaVu-Sans-Bold`,
    ].join(','),
    '-t', '7',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    outPath,
  ];

  try {
    await execFileAsync('ffmpeg', args, { timeout: 60_000 });
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('ffmpeg not installed on this server');
    throw new Error(`ffmpeg text-card failed: ${(err.stderr || err.message).slice(0, 300)}`);
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────

function prepOutDir() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const f of readdirSync(OUT_DIR)) {
    if (!f.endsWith('.mp4')) continue;
    try { if (statSync(join(OUT_DIR, f)).mtimeMs < cutoff) unlinkSync(join(OUT_DIR, f)); } catch {}
  }
}

function getHost() {
  return process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
}

// ── Unified entry point ───────────────────────────────────────────────────

/**
 * @param {object}  opts
 * @param {string}  opts.prompt        - Cinematic prompt for AI footage
 * @param {string}  opts.aspectRatio   - '9:16' | '16:9' | '1:1'
 * @param {number}  opts.timeoutMs
 * @param {object}  [opts.contentItem] - { hook, title, script } for overlay text
 */
export async function generateVideo({
  prompt,
  aspectRatio  = '9:16',
  timeoutMs    = 600_000,
  contentItem  = {},
}) {
  prepOutDir();

  const hook      = contentItem.hook  || contentItem.title || 'Protect Your Family Today';
  const brandName = 'Xpert Life Solutions';
  const cta       = 'Book Your Free Consultation';

  // AI footage providers — try each, composite text on success
  const footageProviders = [
    { name: 'Kie.ai',    enabled: !!process.env.KIE_API_KEY,      fn: () => kieGenerate({ prompt, aspectRatio, timeoutMs }).then(r => r.videoUrl) },
    { name: 'Replicate', enabled: !!process.env.REPLICATE_API_KEY, fn: () => getFootageReplicate({ prompt, aspectRatio, timeoutMs }) },
    { name: 'Fal.ai',    enabled: !!process.env.FAL_API_KEY,       fn: () => getFootageFal({ prompt, aspectRatio, timeoutMs }) },
    { name: 'Luma AI',   enabled: !!process.env.LUMA_API_KEY,      fn: () => getFootageLuma({ prompt, aspectRatio, timeoutMs }) },
  ];

  const errors = [];

  for (const p of footageProviders.filter(p => p.enabled)) {
    let footageUrl;
    try {
      footageUrl = await p.fn();
      console.log(`[Video] ✅ Footage from ${p.name}`);
    } catch (err) {
      const msg = `${p.name}: ${err.message}`;
      errors.push(msg);
      console.warn(`[Video] ⚠️  ${msg}`);
      continue;
    }

    // Got footage — composite text overlay
    try {
      const filename   = `reel-${Date.now()}.mp4`;
      const inputPath  = join(OUT_DIR, `tmp-${Date.now()}.mp4`);
      const outPath    = join(OUT_DIR, filename);

      console.log(`[Video] ⬇️  Downloading footage…`);
      await downloadVideo(footageUrl, inputPath);

      console.log(`[Video] 🎨 Compositing text overlay…`);
      await compositeOverlay({ inputPath, outPath, hook, brandName, cta });

      try { unlinkSync(inputPath); } catch {}

      const cloudUrl = await uploadMedia(outPath, 'video');
      if (cloudUrl) { try { unlinkSync(outPath); } catch {} }
      const videoUrl = cloudUrl || `${getHost()}/videos/${filename}`;
      return { taskId: filename, model: `${p.name.toLowerCase()}-composite`, videoUrl };
    } catch (overlayErr) {
      errors.push(`overlay-${p.name}: ${overlayErr.message}`);
      console.warn(`[Video] ⚠️  Overlay failed for ${p.name}: ${overlayErr.message}`);
      // If overlay failed, store the raw footage URL directly as fallback
      return { taskId: 'raw-footage', model: `${p.name.toLowerCase()}-raw`, videoUrl: footageUrl };
    }
  }

  // No AI footage — pure branded text card
  console.warn(`[Video] ℹ️  No AI footage available, generating text card`);
  try {
    const filename = `card-${Date.now()}.mp4`;
    const outPath  = join(OUT_DIR, filename);
    await generateTextCard({ outPath, hook, brandName, cta });
    const cloudUrl = await uploadMedia(outPath, 'video');
    if (cloudUrl) { try { unlinkSync(outPath); } catch {} }
    return { taskId: filename, model: 'ffmpeg-textcard', videoUrl: cloudUrl || `${getHost()}/videos/${filename}` };
  } catch (err) {
    errors.push(`ffmpeg: ${err.message}`);
  }

  throw new Error(`All video options failed — ${errors.join(' | ')}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
