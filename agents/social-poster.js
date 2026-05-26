'use strict';
import 'dotenv/config';
import { logActivity } from '../integrations/notion-crm.js';

const IG_USER_ID = process.env.INSTAGRAM_USER_ID;
const IG_TOKEN   = process.env.INSTAGRAM_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const NOTION_KEY = process.env.NOTION_API_KEY;
const CONTENT_DB = process.env.NOTION_CONTENT_DATABASE_ID;

// ── Notion: fetch posts due for publishing ─────────────────────────────────

async function getScheduledPosts() {
  const res = await fetch(`https://api.notion.com/v1/databases/${CONTENT_DB}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filter: {
        and: [
          { property: 'Status', select: { equals: 'Scheduled' } },
          { property: 'Scheduled Date', date: { on_or_before: new Date().toISOString() } },
        ],
      },
      page_size: 20,
    }),
  });
  const data = await res.json();
  if (data.status === 400) throw new Error(`Notion query error: ${data.message}`);
  return data.results || [];
}

// ── Notion: mark a page as Published ──────────────────────────────────────

async function markPublished(pageId) {
  await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${NOTION_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { Status: { select: { name: 'Published' } } },
    }),
  });
}

// ── Image URL strategy ─────────────────────────────────────────────────────
// Uses content-generated image from Notion if available, otherwise null.
// Posts without images are skipped — never use random placeholder images.

function buildImageUrl(title, hook, customUrl) {
  return customUrl || null;
}

// ── Instagram Graph API ────────────────────────────────────────────────────

async function postToInstagram(caption, imageUrl, videoUrl) {
  if (!IG_USER_ID || !IG_TOKEN) {
    throw new Error('INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN not set');
  }

  // Step 1 — create media container (Reel if videoUrl, image post otherwise)
  const containerBody = videoUrl
    ? { media_type: 'REELS', video_url: videoUrl, caption, access_token: IG_TOKEN }
    : { image_url: imageUrl, caption, access_token: IG_TOKEN };

  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${IG_USER_ID}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    }
  );
  const container = await containerRes.json();
  if (!container.id) {
    throw new Error(`IG container failed: ${JSON.stringify(container.error || container)}`);
  }

  // Step 2 — wait for container to be ready (video processing takes longer)
  if (videoUrl) {
    await waitForIGContainer(container.id);
  } else {
    await new Promise(r => setTimeout(r, 3000));
  }

  // Step 3 — publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${IG_USER_ID}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: IG_TOKEN,
      }),
    }
  );
  const publish = await publishRes.json();
  if (!publish.id) {
    throw new Error(`IG publish failed: ${JSON.stringify(publish.error || publish)}`);
  }
  return publish.id;
}

async function waitForIGContainer(containerId, maxWaitMs = 300_000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 15_000));
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${IG_TOKEN}`
    );
    const data = await res.json();
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error(`IG container processing error for ${containerId}`);
  }
  throw new Error(`IG container ${containerId} timed out waiting for video processing`);
}

// ── Facebook Page API ──────────────────────────────────────────────────────

async function postToFacebook(caption, imageUrl) {
  if (!FB_PAGE_ID || !IG_TOKEN) {
    throw new Error('FACEBOOK_PAGE_ID or INSTAGRAM_ACCESS_TOKEN not set');
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${FB_PAGE_ID}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:      caption,
        access_token: IG_TOKEN,
      }),
    }
  );
  const data = await res.json();
  if (!data.id) {
    throw new Error(`FB post failed: ${JSON.stringify(data.error || data)}`);
  }
  return data.id;
}

// ── Build caption from Notion content ─────────────────────────────────────

function buildCaption(hook, script, hashtags, type) {
  const parts = [];
  if (hook)     parts.push(hook);
  if (script) {
    const body = type === 'Reel' ? script.slice(0, 300) : script.slice(0, 1800);
    parts.push(body);
  }
  if (hashtags) parts.push(hashtags);
  return parts.join('\n\n').trim();
}

// ── Main export ────────────────────────────────────────────────────────────

export async function runSocialPoster() {
  logActivity('Social Poster', '📱 Checking for scheduled posts to publish');

  if (!NOTION_KEY || !CONTENT_DB) {
    logActivity('Social Poster', '❌ Notion credentials missing');
    return { posted: 0, skipped: 0, errors: 0 };
  }

  const posts = await getScheduledPosts();

  if (posts.length === 0) {
    logActivity('Social Poster', '📱 No posts due — all clear');
    return { posted: 0, skipped: 0, errors: 0 };
  }

  logActivity('Social Poster', `📱 Found ${posts.length} post(s) to publish`);

  let posted = 0, skipped = 0, errors = 0;

  for (const page of posts) {
    const p        = page.properties;
    const title    = p.Title?.title?.[0]?.plain_text    || 'Xpert Life Post';
    const platform = p.Platform?.select?.name           || '';
    const type     = p.Type?.select?.name               || 'Static Post';
    const hook     = p.Hook?.rich_text?.[0]?.plain_text     || '';
    const script   = p.Script?.rich_text?.[0]?.plain_text   || '';
    const hashtags = p.Hashtags?.rich_text?.[0]?.plain_text || '';
    const videoUrl  = p['Video URL']?.url || null;
    const imageUrl  = buildImageUrl(title, hook, p['Image URL']?.url);
    const caption   = buildCaption(hook, script, hashtags, type);

    // Skip posts that need an image but have none (no placeholder images)
    if (!videoUrl && !imageUrl && type !== 'Email Newsletter') {
      logActivity('Social Poster', `⏭️ Skipping "${title}" — no image or video generated yet`);
      skipped++;
      continue;
    }

    try {
      if (platform === 'Instagram') {
        const postId = await postToInstagram(caption, imageUrl, videoUrl);
        const kind   = videoUrl ? 'Reel' : 'image';
        logActivity('Social Poster', `✅ Posted to Instagram (${kind})`, `"${title}" → ${postId}`);
        await markPublished(page.id);
        posted++;

      } else if (platform === 'Facebook') {
        const postId = await postToFacebook(caption, imageUrl);
        logActivity('Social Poster', `✅ Posted to Facebook`, `"${title}" → ${postId}`);
        await markPublished(page.id);
        posted++;

      } else {
        logActivity('Social Poster', `⏭️ Skipping ${platform || 'unknown platform'}`, title);
        skipped++;
      }
    } catch (err) {
      logActivity('Social Poster', `❌ Failed to post "${title}"`, err.message);
      errors++;
    }
  }

  logActivity('Social Poster', `📱 Done — ${posted} posted, ${skipped} skipped, ${errors} errors`);
  return { posted, skipped, errors, total: posts.length };
}
