'use strict';

import { bundle }                      from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { join, dirname }               from 'path';
import { fileURLToPath }               from 'url';
import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const OUT_DIR   = join(ROOT, 'public', 'videos');
const ENTRY     = join(ROOT, 'remotion', 'index.jsx');

// Bundle once per process, reuse for all renders
let bundleCache = null;

async function getBundle() {
  if (!bundleCache) {
    console.log('[Remotion] Bundling compositions (one-time, ~20s)…');
    bundleCache = await bundle({ entryPoint: ENTRY, enableCaching: true });
    console.log('[Remotion] Bundle ready');
  }
  return bundleCache;
}

// Remove videos older than 24 h to keep disk usage in check
function pruneOldVideos() {
  if (!existsSync(OUT_DIR)) return;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const f of readdirSync(OUT_DIR)) {
    if (!f.endsWith('.mp4')) continue;
    const fp = join(OUT_DIR, f);
    try {
      if (statSync(fp).mtimeMs < cutoff) unlinkSync(fp);
    } catch {}
  }
}

export async function generateVideoRemotion({ hook, body, cta, brandName = 'Xpert Life Solutions' }) {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  pruneOldVideos();

  const serveUrl   = await getBundle();
  const inputProps = {
    hook:      hook  || 'Is Your Family Protected?',
    body:      body  || 'Life insurance protects everything you work for.',
    cta:       cta   || 'Get Your Free Quote Today',
    brandName,
    tagline:   'Protecting Families. Building Legacies.',
  };

  const composition = await selectComposition({
    serveUrl,
    id: 'InsuranceAd',
    inputProps,
  });

  const filename       = `ad-${Date.now()}.mp4`;
  const outputLocation = join(OUT_DIR, filename);

  console.log('[Remotion] Rendering video…');
  await renderMedia({
    composition,
    serveUrl,
    codec:                'h264',
    outputLocation,
    inputProps,
    timeoutInMilliseconds: 180_000,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 25 === 0) console.log(`[Remotion] ${pct}% complete`);
    },
  });
  console.log(`[Remotion] Video saved → ${filename}`);

  // Render.com sets RENDER_EXTERNAL_URL automatically; fall back to localhost for dev
  const host = process.env.RENDER_EXTERNAL_URL
    || `http://localhost:${process.env.PORT || 3000}`;

  return {
    taskId:   filename,
    model:    'remotion',
    videoUrl: `${host}/videos/${filename}`,
  };
}
