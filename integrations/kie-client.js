'use strict';

const API_KEY = () => process.env.KIE_API_KEY;

const VEO_GENERATE_URL    = 'https://api.kie.ai/api/v1/veo/generate';
const VEO_STATUS_URL      = (taskId) => `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`;
const RUNWAY_GENERATE_URL = 'https://api.kie.ai/api/v1/runway/generate';
const RUNWAY_STATUS_URL   = (taskId) => `https://api.kie.ai/api/v1/runway/record-detail?taskId=${taskId}`;

function headers() {
  return {
    'Api-Key':      API_KEY(),
    'Content-Type': 'application/json',
  };
}

// ── Generate with Veo3.1 (cinematic AI video) ──────────────────────────────

export async function startVeoGeneration({ prompt, aspectRatio = '9:16' }) {
  if (!API_KEY()) throw new Error('KIE_API_KEY not set');

  const res  = await fetch(VEO_GENERATE_URL, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({ prompt, aspectRatio }),
  });
  const data = await res.json();

  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Kie.ai Veo3 generate failed: ${JSON.stringify(data)}`);
  }
  return { taskId: data.data.taskId, model: 'veo3' };
}

export async function checkVeoStatus(taskId) {
  const res  = await fetch(VEO_STATUS_URL(taskId), { headers: headers() });
  const data = await res.json();
  const d    = data.data || {};

  return {
    status:   d.status || 'unknown',            // wait | queueing | generating | success | fail
    videoUrl: d.resultUrls?.[0] || null,
  };
}

// ── Generate with Runway (fallback) ───────────────────────────────────────

export async function startRunwayGeneration({ prompt, aspectRatio = '9:16' }) {
  if (!API_KEY()) throw new Error('KIE_API_KEY not set');

  const res  = await fetch(RUNWAY_GENERATE_URL, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({ prompt, aspectRatio, duration: '10', quality: '720p' }),
  });
  const data = await res.json();

  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Kie.ai Runway generate failed: ${JSON.stringify(data)}`);
  }
  return { taskId: data.data.taskId, model: 'runway' };
}

export async function checkRunwayStatus(taskId) {
  const res  = await fetch(RUNWAY_STATUS_URL(taskId), { headers: headers() });
  const data = await res.json();
  const d    = data.data || {};

  return {
    status:   d.status || 'unknown',
    videoUrl: d.resultUrls?.[0] || null,
  };
}

// ── Generate and wait (Veo3.1 with Runway fallback) ───────────────────────

export async function generateVideoAndWait({ prompt, aspectRatio = '9:16', timeoutMs = 600_000 }) {
  if (!API_KEY()) throw new Error('KIE_API_KEY not set');

  // Try Veo3.1 first — most cinematic quality
  let taskId, model, checkStatus;
  try {
    ({ taskId, model } = await startVeoGeneration({ prompt, aspectRatio }));
    checkStatus = () => checkVeoStatus(taskId);
  } catch (err) {
    // Fall back to Runway if Veo3 fails
    console.warn(`[Kie.ai] Veo3 start failed (${err.message}), falling back to Runway`);
    ({ taskId, model } = await startRunwayGeneration({ prompt, aspectRatio }));
    checkStatus = () => checkRunwayStatus(taskId);
  }

  const deadline = Date.now() + timeoutMs;
  // Progressive polling: 20 s → 30 s → 60 s
  const INTERVALS = [20_000, 20_000, 30_000, 30_000, 60_000];
  let attempt = 0;

  while (Date.now() < deadline) {
    await sleep(INTERVALS[Math.min(attempt, INTERVALS.length - 1)]);

    const { status, videoUrl } = await checkStatus();

    if (status === 'success' && videoUrl) {
      return { taskId, model, videoUrl };
    }
    if (status === 'fail') {
      throw new Error(`Kie.ai ${model} task ${taskId} failed during generation`);
    }

    attempt++;
  }

  throw new Error(`Kie.ai video ${taskId} timed out after ${Math.round(timeoutMs / 60000)} min`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
