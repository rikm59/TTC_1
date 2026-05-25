'use strict';

/**
 * Slide / post image generation — 3-provider fallback:
 *
 *  1. Replicate  — Flux Schnell  (~$0.003/image, very fast)
 *  2. Fal.ai     — Flux Schnell  (~$0.003/image, synchronous)
 *  3. DALL-E 3   — OpenAI        (~$0.04/image,  highest quality)
 *
 * Returns a permanent-ish URL (Replicate/Fal CDN URLs last ~7 days;
 * Notion caches them on first render so they survive beyond expiry).
 */

// ── Replicate Flux Schnell ─────────────────────────────────────────────────

async function generateImageReplicate({ prompt }) {
  const key = process.env.REPLICATE_API_KEY;
  if (!key) throw new Error('REPLICATE_API_KEY not set');

  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ input: { prompt, aspect_ratio: '1:1', output_format: 'jpg', output_quality: 85 } }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Replicate image submit failed: ${JSON.stringify(data)}`);

  const id       = data.id;
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    await sleep(3_000);
    const poll   = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const status = await poll.json();
    if (status.status === 'succeeded' && status.output?.[0]) return status.output[0];
    if (status.status === 'failed') throw new Error(`Replicate image failed: ${status.error}`);
  }
  throw new Error('Replicate image timed out');
}

// ── Fal.ai Flux Schnell (synchronous) ─────────────────────────────────────

async function generateImageFal({ prompt }) {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set');

  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method:  'POST',
    headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt, image_size: 'square_hd', num_images: 1 }),
  });
  const data = await res.json();
  const url  = data.images?.[0]?.url;
  if (!url) throw new Error(`Fal.ai image failed: ${JSON.stringify(data)}`);
  return url;
}

// ── DALL-E 3 ───────────────────────────────────────────────────────────────

async function generateImageDallE({ prompt }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard' }),
  });
  const data = await res.json();
  const url  = data.data?.[0]?.url;
  if (!url) throw new Error(`DALL-E 3 failed: ${JSON.stringify(data)}`);
  return url;
}

// ── Unified entry point ────────────────────────────────────────────────────

/**
 * Generate a single branded slide / post image.
 * Returns a URL string, or null if all providers fail.
 */
export async function generateSlideImage({ prompt }) {
  const branded = `${prompt}. Professional life insurance brand advertisement. ` +
    `Clean modern design, warm golden lighting, photorealistic, Instagram-ready, no text overlay.`;

  const providers = [
    { name: 'Replicate (Flux)', enabled: !!process.env.REPLICATE_API_KEY, fn: () => generateImageReplicate({ prompt: branded }) },
    { name: 'Fal.ai (Flux)',    enabled: !!process.env.FAL_API_KEY,        fn: () => generateImageFal({ prompt: branded })       },
    { name: 'DALL-E 3',        enabled: !!process.env.OPENAI_API_KEY,     fn: () => generateImageDallE({ prompt: branded })      },
  ];

  for (const p of providers.filter(p => p.enabled)) {
    try {
      const url = await p.fn();
      console.log(`[Image] ✅ ${p.name} generated image`);
      return url;
    } catch (err) {
      console.warn(`[Image] ⚠️  ${p.name} failed (${err.message}) — trying next`);
    }
  }

  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
