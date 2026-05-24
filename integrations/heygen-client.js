'use strict';

const HEYGEN_API_KEY   = () => process.env.HEYGEN_API_KEY;
const DEFAULT_AVATAR   = () => process.env.HEYGEN_AVATAR_ID   || 'Abigail_expressive_2024112501';
const DEFAULT_VOICE    = () => process.env.HEYGEN_VOICE_ID    || '1bd001e7e50f421d891986aad5158bc8';

const GENERATE_URL     = 'https://api.heygen.com/v2/video/generate';
const STATUS_URL       = (id) => `https://api.heygen.com/v1/video_status.get?video_id=${id}`;

function heygenHeaders() {
  return {
    'X-Api-Key':    HEYGEN_API_KEY(),
    'Content-Type': 'application/json',
  };
}

// ── Start video generation (returns immediately with video_id) ─────────────

export async function startVideoGeneration({ script, title, format = 'portrait' }) {
  if (!HEYGEN_API_KEY()) throw new Error('HEYGEN_API_KEY not set');

  const dimension = format === 'landscape'
    ? { width: 1920, height: 1080 }
    : { width: 1080, height: 1920 }; // portrait / reels default

  const body = {
    video_inputs: [{
      character: {
        type:         'avatar',
        avatar_id:    DEFAULT_AVATAR(),
        avatar_style: 'normal',
      },
      voice: {
        type:       'text',
        input_text: script,
        voice_id:   DEFAULT_VOICE(),
      },
      background: {
        type:  'color',
        value: '#1B2A4A', // Xpert Life navy brand color
      },
    }],
    dimension,
    title: title.slice(0, 100),
  };

  const res  = await fetch(GENERATE_URL, { method: 'POST', headers: heygenHeaders(), body: JSON.stringify(body) });
  const data = await res.json();

  if (data.error) throw new Error(`HeyGen generate failed: ${JSON.stringify(data.error)}`);
  if (!data.data?.video_id) throw new Error(`HeyGen: no video_id in response: ${JSON.stringify(data)}`);

  return { videoId: data.data.video_id };
}

// ── Check current status of a video ───────────────────────────────────────

export async function checkVideoStatus(videoId) {
  if (!HEYGEN_API_KEY()) throw new Error('HEYGEN_API_KEY not set');

  const res  = await fetch(STATUS_URL(videoId), { headers: heygenHeaders() });
  const data = await res.json();

  if (data.error) throw new Error(`HeyGen status check failed: ${JSON.stringify(data.error)}`);

  const d = data.data || {};
  return {
    status:       d.status   || 'unknown',   // processing | completed | failed
    videoUrl:     d.video_url     || null,
    thumbnailUrl: d.thumbnail_url || null,
  };
}

// ── Generate and wait for completion (polls up to timeoutMs) ──────────────

export async function generateVideoAndWait({ script, title, format = 'portrait', timeoutMs = 900_000 }) {
  const { videoId } = await startVideoGeneration({ script, title, format });

  const deadline = Date.now() + timeoutMs;
  // Progressive polling: 30 s → 60 s → 120 s intervals
  const INTERVALS = [30_000, 30_000, 60_000, 60_000, 120_000];
  let attempt = 0;

  while (Date.now() < deadline) {
    const delay = INTERVALS[Math.min(attempt, INTERVALS.length - 1)];
    await sleep(delay);

    const { status, videoUrl, thumbnailUrl } = await checkVideoStatus(videoId);

    if (status === 'completed' && videoUrl) {
      return { videoId, videoUrl, thumbnailUrl };
    }
    if (status === 'failed') {
      throw new Error(`HeyGen video ${videoId} failed during generation`);
    }

    attempt++;
  }

  throw new Error(`HeyGen video ${videoId} timed out after ${Math.round(timeoutMs / 60000)} minutes`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
