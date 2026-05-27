'use strict';

/**
 * Image generation — AI providers with guaranteed ffmpeg fallback.
 *
 * Single cover image:
 *   1. Replicate  — Flux Schnell  (~$0.003/image)
 *   2. Fal.ai     — Flux Schnell  (~$0.003/image)
 *   3. DALL-E 3   — OpenAI        (~$0.04/image)
 *   4. ffmpeg     — branded PNG   (always works, no API needed)
 *
 * Carousel slide images:
 *   Generates one 1080×1920 branded PNG per slide using ffmpeg.
 *   Each slide: navy background, gold headline, white body, brand footer.
 *   Uploads to Cloudinary for a permanent URL; falls back to Render URL.
 */

import { execFile }  from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, unlinkSync, writeFileSync } from 'fs';
import { uploadMedia } from './cloudinary-client.js';

const execFileAsync = promisify(execFile);
const __dirname     = dirname(fileURLToPath(import.meta.url));
const ROOT          = join(__dirname, '..');
const OUT_DIR       = join(ROOT, 'public', 'videos'); // reuse served dir

function prepDir() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
}

function getHost() {
  return process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
}

// ── Text helpers ───────────────────────────────────────────────────────────

function wrapText(text, maxChars) {
  const words = (text || '').split(' ');
  const lines = [];
  let line    = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function ffSafe(s) {
  return (s || '').replace(/[\\':]/g, ' ').replace(/[[\]{}()<>%]/g, '').slice(0, 120);
}

// ── ffmpeg branded PNG generator ──────────────────────────────────────────

async function generatePNG({ outPath, title, body, slideNum, total, brandName }) {
  const brand      = ffSafe(brandName || 'Xpert Life Solutions');
  const tagline    = 'Protecting Families. Building Legacies.';
  const titleLines = wrapText(title || '', 22).slice(0, 3);
  const bodyLines  = wrapText(body  || '', 34).slice(0, 7);

  const filters = [];

  // Accent bars
  filters.push(`drawbox=x=0:y=0:w=1080:h=8:color=0xC9A84C:t=fill`);
  filters.push(`drawbox=x=0:y=1912:w=1080:h=8:color=0xC9A84C:t=fill`);

  // Brand name top-center
  filters.push(`drawtext=text='${brand}':fontcolor=0xC9A84C:fontsize=30:x=(w-text_w)/2:y=28:font=DejaVu-Sans-Bold`);

  // Slide number top-right (only when part of a set)
  if (slideNum && total) {
    filters.push(`drawtext=text='${slideNum} / ${total}':fontcolor=0xC9A84C@0.7:fontsize=26:x=w-text_w-40:y=32:font=DejaVu-Sans`);
  }

  // Thin gold separator under brand name
  filters.push(`drawbox=x=60:y=80:w=960:h=2:color=0xC9A84C@0.3:t=fill`);

  // Title lines (gold, large, centered)
  const titleBaseY = 300;
  const titleLineH = 100;
  titleLines.forEach((line, i) => {
    filters.push(
      `drawtext=text='${ffSafe(line)}':fontcolor=0xC9A84C:fontsize=66:` +
      `x=(w-text_w)/2:y=${titleBaseY + i * titleLineH}:font=DejaVu-Sans-Bold:` +
      `shadowcolor=black:shadowx=2:shadowy=2`
    );
  });

  // Semi-transparent strip behind body text
  const bodyTop    = titleBaseY + titleLines.length * titleLineH + 40;
  const bodyHeight = bodyLines.length * 56 + 40;
  if (bodyLines.length) {
    filters.push(`drawbox=x=0:y=${bodyTop - 20}:w=1080:h=${bodyHeight}:color=black@0.25:t=fill`);
  }

  // Body lines (white, left-aligned)
  bodyLines.forEach((line, i) => {
    filters.push(
      `drawtext=text='${ffSafe(line)}':fontcolor=white:fontsize=38:` +
      `x=80:y=${bodyTop + i * 56}:font=DejaVu-Sans`
    );
  });

  // Footer bar + tagline
  filters.push(`drawbox=x=0:y=1840:w=1080:h=80:color=0xC9A84C@0.12:t=fill`);
  filters.push(`drawtext=text='${ffSafe(tagline)}':fontcolor=0xC9A84C:fontsize=28:x=(w-text_w)/2:y=1862:font=DejaVu-Sans`);

  const args = [
    '-y',
    '-f', 'lavfi', '-i', `color=c=0x0B1F3A:size=1080x1920:rate=1`,
    '-vf', filters.join(','),
    '-frames:v', '1',
    '-f', 'image2',
    outPath,
  ];

  try {
    await execFileAsync('ffmpeg', args, { timeout: 30_000 });
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('ffmpeg not installed');
    throw new Error(`ffmpeg PNG failed: ${(err.stderr || err.message).slice(0, 200)}`);
  }
}

// ── Carousel slide image generator ────────────────────────────────────────

/**
 * Generate one branded PNG per carousel slide.
 * Uploads to Cloudinary for a permanent URL; falls back to Render URL.
 * @param {Array<{slideNumber,title,body}>} slides
 * @param {string} brandName
 * @returns {Promise<string[]>}  array of image URLs, one per slide
 */
export async function generateCarouselSlideImages(slides, brandName = 'Xpert Life Solutions') {
  prepDir();
  const urls = [];

  for (const slide of slides) {
    const filename = `slide-${Date.now()}-${slide.slideNumber || urls.length + 1}.png`;
    const outPath  = join(OUT_DIR, filename);

    try {
      await generatePNG({
        outPath,
        title:    slide.title,
        body:     slide.body,
        slideNum: slide.slideNumber,
        total:    slides.length,
        brandName,
      });

      // Try Cloudinary for permanent URL
      const cloudUrl = await uploadMedia(outPath, 'image');
      if (cloudUrl) {
        urls.push(cloudUrl);
        try { unlinkSync(outPath); } catch {}
      } else {
        urls.push(`${getHost()}/videos/${filename}`);
      }
    } catch (err) {
      console.warn(`[Image] Slide ${slide.slideNumber} failed: ${err.message}`);
      urls.push(''); // placeholder so index alignment is preserved
    }
  }

  return urls;
}

// ── Single cover image — AI providers with ffmpeg fallback ─────────────────

async function generateImageReplicate({ prompt }) {
  const key = process.env.REPLICATE_API_KEY;
  if (!key) throw new Error('REPLICATE_API_KEY not set');

  const res  = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ input: { prompt, aspect_ratio: '1:1', output_format: 'jpg', output_quality: 85 } }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Replicate submit failed: ${JSON.stringify(data).slice(0, 120)}`);

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await sleep(3_000);
    const poll   = await fetch(`https://api.replicate.com/v1/predictions/${data.id}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const status = await poll.json();
    if (status.status === 'succeeded' && status.output?.[0]) return status.output[0];
    if (status.status === 'failed') throw new Error(`Replicate failed: ${status.error}`);
  }
  throw new Error('Replicate image timed out');
}

async function generateImageFal({ prompt }) {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set');

  const res  = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method:  'POST',
    headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, image_size: 'square_hd', num_images: 1 }),
  });
  const data = await res.json();
  const url  = data.images?.[0]?.url;
  if (!url) throw new Error(`Fal.ai image failed: ${JSON.stringify(data).slice(0, 120)}`);
  return url;
}

async function generateImageDallE({ prompt }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');

  const res  = await fetch('https://api.openai.com/v1/images/generations', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard' }),
  });
  const data = await res.json();
  const url  = data.data?.[0]?.url;
  if (!url) throw new Error(`DALL-E 3 failed: ${JSON.stringify(data).slice(0, 120)}`);
  return url;
}

async function generateImageFfmpeg({ prompt, title }) {
  prepDir();
  const filename = `cover-${Date.now()}.png`;
  const outPath  = join(OUT_DIR, filename);

  await generatePNG({
    outPath,
    title:    title || prompt?.slice(0, 60) || 'Xpert Life Solutions',
    body:     '',
    brandName: 'Xpert Life Solutions',
  });

  const cloudUrl = await uploadMedia(outPath, 'image');
  if (cloudUrl) {
    try { unlinkSync(outPath); } catch {}
    return cloudUrl;
  }
  return `${getHost()}/videos/${filename}`;
}

/**
 * Generate a single branded image for cover / static post / story.
 * Returns a URL string, or null if all providers fail.
 */
export async function generateSlideImage({ prompt, title }) {
  const branded = `${prompt}. Professional life insurance brand. ` +
    `Clean modern design, warm golden lighting, photorealistic, Instagram-ready, no text overlay.`;

  const providers = [
    { name: 'Replicate',  enabled: !!process.env.REPLICATE_API_KEY, fn: () => generateImageReplicate({ prompt: branded }) },
    { name: 'Fal.ai',     enabled: !!process.env.FAL_API_KEY,       fn: () => generateImageFal({ prompt: branded }) },
    { name: 'DALL-E 3',   enabled: !!process.env.OPENAI_API_KEY,    fn: () => generateImageDallE({ prompt: branded }) },
    { name: 'ffmpeg',     enabled: true,                             fn: () => generateImageFfmpeg({ prompt, title }) },
  ];

  for (const p of providers.filter(p => p.enabled)) {
    try {
      const url = await p.fn();
      if (url) {
        console.log(`[Image] ✅ ${p.name}`);
        return url;
      }
    } catch (err) {
      console.warn(`[Image] ⚠️  ${p.name} failed (${err.message}) — trying next`);
    }
  }

  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
