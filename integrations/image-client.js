'use strict';

/**
 * Image generation — AI-generated backgrounds + ffmpeg text composite.
 *
 * Carousel slide pipeline (per slide):
 *   1. Build a content-aware visual prompt from the slide title + body
 *   2. Generate AI background: Replicate → Fal.ai → DALL-E 3
 *   3. Download background + composite brand text overlay via ffmpeg
 *   4. If all AI fails: pure ffmpeg branded PNG fallback
 *   5. Upload to Cloudinary → permanent URL
 *
 * Single cover image:
 *   Same AI chain, no text composite needed (just the raw image).
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
const OUT_DIR       = join(ROOT, 'public', 'videos');

// Run ffmpeg; on any failure retry with font= directives stripped so the call
// succeeds on servers that don't have DejaVu fonts installed.
async function execFfmpeg(args, timeoutMs = 60_000) {
  try {
    await execFileAsync('ffmpeg', args, { timeout: timeoutMs });
  } catch (firstErr) {
    if (firstErr.code === 'ENOENT') throw new Error('ffmpeg not installed');
    const fallbackArgs = args.map(a =>
      typeof a === 'string' ? a.replace(/:font=DejaVu-Sans(?:-Bold)?/g, '') : a
    );
    try {
      await execFileAsync('ffmpeg', fallbackArgs, { timeout: timeoutMs });
    } catch (err2) {
      throw new Error(`ffmpeg failed: ${(err2.stderr || err2.message).slice(0, 300)}`);
    }
  }
}

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
  // Strip chars that break ffmpeg filter arguments
  return (s || '').replace(/[\\':]/g, ' ').replace(/[[\]{}()<>%]/g, '').slice(0, 120);
}

// ── AI Image Providers ─────────────────────────────────────────────────────

async function generateImageReplicate({ prompt, aspectRatio = '9:16' }) {
  const key = process.env.REPLICATE_API_KEY;
  if (!key) throw new Error('REPLICATE_API_KEY not set');

  const res  = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ input: { prompt, aspect_ratio: aspectRatio, output_format: 'jpg', output_quality: 85 } }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Replicate submit failed: ${JSON.stringify(data).slice(0, 120)}`);

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(4_000);
    const poll   = await fetch(`https://api.replicate.com/v1/predictions/${data.id}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const status = await poll.json();
    if (status.status === 'succeeded' && status.output?.[0]) return status.output[0];
    if (status.status === 'failed') throw new Error(`Replicate failed: ${status.error}`);
  }
  throw new Error('Replicate image timed out');
}

async function generateImageFal({ prompt, aspectRatio = '9:16' }) {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set');

  // Map to Fal's image_size enum
  const sizeMap = { '9:16': 'portrait_4_3', '16:9': 'landscape_16_9', '1:1': 'square_hd' };
  const imageSize = sizeMap[aspectRatio] || 'portrait_4_3';

  const res  = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method:  'POST',
    headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, image_size: imageSize, num_images: 1 }),
  });
  const data = await res.json();
  const url  = data.images?.[0]?.url;
  if (!url) throw new Error(`Fal.ai image failed: ${JSON.stringify(data).slice(0, 120)}`);
  return url;
}

async function generateImageDallE({ prompt, aspectRatio = '9:16' }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');

  const size = aspectRatio === '9:16' ? '1024x1792'
             : aspectRatio === '16:9' ? '1792x1024' : '1024x1024';

  const res  = await fetch('https://api.openai.com/v1/images/generations', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, quality: 'standard' }),
  });
  const data = await res.json();
  const url  = data.data?.[0]?.url;
  if (!url) throw new Error(`DALL-E 3 failed: ${JSON.stringify(data).slice(0, 120)}`);
  return url;
}

async function downloadImage(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  const buf = await res.arrayBuffer();
  writeFileSync(dest, Buffer.from(buf));
}

// ── AI image + text composite for a carousel slide ─────────────────────────

function buildSlideImagePrompt(slide) {
  const title      = (slide.title      || '').slice(0, 80);
  const body       = (slide.body       || '').slice(0, 150);
  const visualNote = (slide.visualNote || '').slice(0, 120);
  const content    = (title + ' ' + body + ' ' + visualNote).toLowerCase();

  let scene = 'warm family portrait, cozy home setting, natural golden hour lighting';

  if (content.includes('retire') || content.includes('senior')) {
    scene = 'retired couple relaxing outdoors, peaceful park, soft afternoon sun, happiness and security';
  } else if (content.includes('business') || content.includes('entrepreneur') || content.includes('owner')) {
    scene = 'confident professional at modern desk, polished office environment, purposeful expression';
  } else if (content.includes('newlywed') || content.includes('couple') || content.includes('wedding') || content.includes('marriage')) {
    scene = 'young couple smiling together, golden sunset, looking toward the future';
  } else if (content.includes('parent') || content.includes('child') || content.includes('mom') || content.includes('dad') || content.includes('baby')) {
    scene = 'loving parent with young child, bright home, playful warm light, sense of protection';
  } else if (content.includes('premium') || content.includes('cost') || content.includes('price') || content.includes('afford') || content.includes('budget')) {
    scene = 'person thoughtfully reviewing papers with a hopeful expression, bright kitchen table';
  } else if (content.includes('health') || content.includes('condition') || content.includes('qualify') || content.includes('medical')) {
    scene = 'reassuring healthcare consultation, warm clinic, compassionate advisor and patient';
  } else if (content.includes('term') || content.includes('whole') || content.includes('policy')) {
    scene = 'professional life insurance advisor meeting with a family, home office setting, warm lighting';
  } else if (content.includes('debt') || content.includes('mortgage') || content.includes('finance') || content.includes('money')) {
    scene = 'family reviewing home finances together, hopeful expressions, bright living room';
  } else if (content.includes('protect') || content.includes('secure') || content.includes('legacy')) {
    scene = 'parent shielding children, sunset backlit silhouette, sense of strength and protection';
  }

  // If the AI writer gave us a specific visual note, prioritize it
  const visualDetail = visualNote
    ? `Art direction: ${visualNote}. `
    : '';

  return `Editorial lifestyle photography for a life insurance brand. ` +
    `Scene: ${scene}. ${visualDetail}` +
    `Photorealistic, warm natural lighting, shallow depth of field, authentic emotions, no posed look. ` +
    `Professional advertising photography — National Geographic quality. ` +
    `Portrait vertical orientation (tall). NO text, NO logos, NO overlaid words anywhere in the image. ` +
    `High production value, cinematic composition, suitable for branded social media.`;
}

async function compositeSlideText({ bgPath, outPath, slide, brandName }) {
  const brand      = ffSafe(brandName || 'Xpert Life Solutions');
  const tagline    = 'Protecting Families. Building Legacies.';
  const titleLines = wrapText(slide.title || '', 22).slice(0, 3);
  const bodyLines  = wrapText(slide.body  || '', 36).slice(0, 6);

  const filters = [
    // Scale AI photo to fill 1080×1920 portrait exactly
    `scale=1080:1920:force_original_aspect_ratio=increase`,
    `crop=1080:1920`,
    // Subtle dark tint across whole image for text readability
    `drawbox=x=0:y=0:w=1080:h=1920:color=black@0.30:t=fill`,
    // Brand bar — top
    `drawbox=x=0:y=0:w=1080:h=82:color=0x0B1F3A@0.90:t=fill`,
    `drawtext=text='${brand}':fontcolor=0xC9A84C:fontsize=32:x=(w-text_w)/2:y=24:font=DejaVu-Sans-Bold`,
    `drawbox=x=0:y=80:w=1080:h=3:color=0xC9A84C:t=fill`,
  ];

  // Slide number top-right
  if (slide.slideNumber) {
    filters.push(
      `drawtext=text='${slide.slideNumber}':fontcolor=0xC9A84C@0.80:fontsize=26:x=w-56:y=26:font=DejaVu-Sans-Bold`
    );
  }

  // Title block (center of frame)
  const titleBaseY = 680;
  const titleH     = titleLines.length * 88 + 48;
  if (titleLines.length) {
    filters.push(`drawbox=x=0:y=${titleBaseY - 18}:w=1080:h=${titleH}:color=0x0B1F3A@0.80:t=fill`);
    titleLines.forEach((line, i) => {
      filters.push(
        `drawtext=text='${ffSafe(line)}':fontcolor=0xC9A84C:fontsize=62:` +
        `x=(w-text_w)/2:y=${titleBaseY + i * 88}:font=DejaVu-Sans-Bold:shadowcolor=black:shadowx=2:shadowy=2`
      );
    });
  }

  // Body block (below title)
  if (bodyLines.length) {
    const bodyBaseY = titleBaseY + titleH + 12;
    const bodyH     = bodyLines.length * 50 + 36;
    filters.push(`drawbox=x=0:y=${bodyBaseY}:w=1080:h=${bodyH}:color=black@0.58:t=fill`);
    bodyLines.forEach((line, i) => {
      filters.push(
        `drawtext=text='${ffSafe(line)}':fontcolor=white:fontsize=34:` +
        `x=60:y=${bodyBaseY + 18 + i * 50}:font=DejaVu-Sans`
      );
    });
  }

  // Gold footer bar
  filters.push(`drawbox=x=0:y=1838:w=1080:h=82:color=0xC9A84C@0.92:t=fill`);
  filters.push(
    `drawtext=text='${ffSafe(tagline)}':fontcolor=0x0B1F3A:fontsize=26:x=(w-text_w)/2:y=1862:font=DejaVu-Sans-Bold`
  );

  const args = [
    '-y', '-i', bgPath,
    '-vf', filters.join(','),
    '-frames:v', '1', '-f', 'image2',
    outPath,
  ];

  await execFfmpeg(args, 60_000);
}

// ── Pure ffmpeg branded PNG (no AI background — reliable fallback) ─────────

async function generatePNG({ outPath, title, body, slideNum, total, brandName }) {
  const brand      = ffSafe(brandName || 'Xpert Life Solutions');
  const tagline    = 'Protecting Families. Building Legacies.';
  const titleLines = wrapText(title || '', 22).slice(0, 3);
  const bodyLines  = wrapText(body  || '', 34).slice(0, 7);

  const filters = [];

  // Gold accent bars top/bottom
  filters.push(`drawbox=x=0:y=0:w=1080:h=8:color=0xC9A84C:t=fill`);
  filters.push(`drawbox=x=0:y=1912:w=1080:h=8:color=0xC9A84C:t=fill`);

  // Brand name top-center
  filters.push(`drawtext=text='${brand}':fontcolor=0xC9A84C:fontsize=30:x=(w-text_w)/2:y=28:font=DejaVu-Sans-Bold`);

  // Slide number top-right
  if (slideNum && total) {
    filters.push(`drawtext=text='${slideNum} / ${total}':fontcolor=0xC9A84C@0.7:fontsize=26:x=w-text_w-40:y=32:font=DejaVu-Sans`);
  }

  // Thin separator under brand name
  filters.push(`drawbox=x=60:y=80:w=960:h=2:color=0xC9A84C@0.3:t=fill`);

  // Title lines (gold, centered)
  const titleBaseY = 300;
  const titleLineH = 100;
  titleLines.forEach((line, i) => {
    filters.push(
      `drawtext=text='${ffSafe(line)}':fontcolor=0xC9A84C:fontsize=66:` +
      `x=(w-text_w)/2:y=${titleBaseY + i * titleLineH}:font=DejaVu-Sans-Bold:shadowcolor=black:shadowx=2:shadowy=2`
    );
  });

  // Body text
  const bodyTop    = titleBaseY + titleLines.length * titleLineH + 40;
  const bodyHeight = bodyLines.length * 56 + 40;
  if (bodyLines.length) {
    filters.push(`drawbox=x=0:y=${bodyTop - 20}:w=1080:h=${bodyHeight}:color=black@0.25:t=fill`);
  }
  bodyLines.forEach((line, i) => {
    filters.push(
      `drawtext=text='${ffSafe(line)}':fontcolor=white:fontsize=38:x=80:y=${bodyTop + i * 56}:font=DejaVu-Sans`
    );
  });

  // Footer
  filters.push(`drawbox=x=0:y=1840:w=1080:h=80:color=0xC9A84C@0.12:t=fill`);
  filters.push(`drawtext=text='${ffSafe(tagline)}':fontcolor=0xC9A84C:fontsize=28:x=(w-text_w)/2:y=1862:font=DejaVu-Sans`);

  const args = [
    '-y',
    '-f', 'lavfi', '-i', `color=c=0x0B1F3A:size=1080x1920:rate=1`,
    '-vf', filters.join(','),
    '-frames:v', '1', '-f', 'image2',
    outPath,
  ];

  await execFfmpeg(args, 30_000);
}

// ── Carousel slide image generator ────────────────────────────────────────

/**
 * Generate one branded image per carousel slide.
 *
 * Each slide gets an AI-generated background image that matches the slide's
 * storyline, with the brand + title + body text composited on top via ffmpeg.
 * Falls back to a pure ffmpeg branded PNG if AI is unavailable.
 * Uploads to Cloudinary for a permanent URL; falls back to Render URL.
 *
 * @param {Array<{slideNumber, title, body}>} slides
 * @param {string} brandName
 * @returns {Promise<string[]>}
 */
export async function generateCarouselSlideImages(slides, brandName = 'Xpert Life Solutions') {
  prepDir();
  const base = Date.now();

  return Promise.all(slides.map(async (slide, idx) => {
    const ts       = base + idx;
    const filename = `slide-${ts}-${slide.slideNumber || idx + 1}.png`;
    const outPath  = join(OUT_DIR, filename);

    try {
      const imagePrompt = buildSlideImagePrompt(slide);

      const aiProviders = [
        { name: 'Replicate', enabled: !!process.env.REPLICATE_API_KEY, fn: () => generateImageReplicate({ prompt: imagePrompt, aspectRatio: '9:16' }) },
        { name: 'Fal.ai',    enabled: !!process.env.FAL_API_KEY,       fn: () => generateImageFal({ prompt: imagePrompt, aspectRatio: '9:16' }) },
        { name: 'DALL-E 3',  enabled: !!process.env.OPENAI_API_KEY,    fn: () => generateImageDallE({ prompt: imagePrompt, aspectRatio: '9:16' }) },
      ];

      let bgUrl = null;
      for (const p of aiProviders.filter(p => p.enabled)) {
        try {
          bgUrl = await p.fn();
          if (bgUrl) {
            console.log(`[Image] ✅ Slide ${slide.slideNumber} background — ${p.name}`);
            break;
          }
        } catch (err) {
          console.warn(`[Image] ⚠️  ${p.name} slide ${slide.slideNumber}: ${err.message}`);
        }
      }

      if (bgUrl) {
        const bgExt  = bgUrl.includes('.png') ? '.png' : '.jpg';
        const bgPath = join(OUT_DIR, `bg-${ts}${bgExt}`);
        await downloadImage(bgUrl, bgPath);
        await compositeSlideText({ bgPath, outPath, slide, brandName });
        try { unlinkSync(bgPath); } catch {}
      } else {
        console.log(`[Image] ℹ️  Slide ${slide.slideNumber} — no AI key, using ffmpeg fallback`);
        await generatePNG({
          outPath,
          title:    slide.title,
          body:     slide.body,
          slideNum: slide.slideNumber,
          total:    slides.length,
          brandName,
        });
      }

      const cloudUrl = await uploadMedia(outPath, 'image');
      if (cloudUrl) {
        try { unlinkSync(outPath); } catch {}
        return cloudUrl;
      }
      return `${getHost()}/videos/${filename}`;
    } catch (err) {
      console.warn(`[Image] Slide ${slide.slideNumber || idx + 1} failed: ${err.message}`);
      return '';
    }
  }));
}

// ── Single cover image — AI providers with ffmpeg fallback ─────────────────

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
 * Generate a single branded image for a cover, static post, or story.
 * Returns a URL string, or null if all providers fail.
 */
export async function generateSlideImage({ prompt, title }) {
  const branded = `${prompt}. Professional life insurance brand. ` +
    `Clean modern design, warm golden lighting, photorealistic, Instagram-ready, no text overlay.`;

  const providers = [
    { name: 'Replicate',  enabled: !!process.env.REPLICATE_API_KEY, fn: () => generateImageReplicate({ prompt: branded, aspectRatio: '1:1' }) },
    { name: 'Fal.ai',     enabled: !!process.env.FAL_API_KEY,       fn: () => generateImageFal({ prompt: branded, aspectRatio: '1:1' }) },
    { name: 'DALL-E 3',   enabled: !!process.env.OPENAI_API_KEY,    fn: () => generateImageDallE({ prompt: branded, aspectRatio: '1:1' }) },
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
