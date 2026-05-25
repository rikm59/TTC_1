'use strict';

/**
 * Marketing Team Agent
 * Runs Mon / Wed / Fri at 9 AM.
 * Creates complete content packages: video scripts, carousel slides,
 * caption copy, and hashtags — stored in the Notion content calendar.
 */

import { askClaude, askClaudeJSON } from '../integrations/claude-client.js';
import { createContentItem, logActivity } from '../integrations/notion-crm.js';
import { generateVideo } from '../integrations/video-client.js';

const BRAND_VOICE = `Xpert Life Solutions brand voice:
- Warm, trustworthy, educational (never fear-mongering)
- Talks to families aged 25-55
- Focuses on PROTECTING what matters most
- Uses real-world scenarios and simple language
- Never jargon-heavy
- Tagline: "Protecting Families. Building Legacies."`;

// ─── Main Run ─────────────────────────────────────────────────────────────────

export async function runMarketingTeam() {
  logActivity('Marketing Team', '🎨 Content creation starting');

  const calendar = await buildWeeklyContentCalendar();
  let created = 0;

  for (const item of calendar) {
    try {
      const full = await buildFullContent(item);
      const withVideo = await maybeGenerateVideo(full);
      await createContentItem(withVideo);
      created++;
      logActivity('Marketing Team', `✅ Content created`, `${full.platform} ${full.type}: "${full.title}"${withVideo.videoUrl ? ' + video' : ''}`);
    } catch (err) {
      logActivity('Marketing Team', `❌ Content creation failed`, err.message);
    }
  }

  logActivity('Marketing Team', `🏁 Content run complete`, `${created} pieces created`);
  return { created, items: calendar };
}

// ─── Weekly Content Calendar ──────────────────────────────────────────────────

async function buildWeeklyContentCalendar() {
  const today = new Date();

  const SYSTEM = `You are a social media content strategist for a life insurance business.
${BRAND_VOICE}

Create a 7-day content calendar with 7 items (one per day).
Vary the platforms: Instagram, Facebook, TikTok/Reels.
Vary the types: Reel (short video), Carousel (swipe post), Static Post, Story, Email.

Return a JSON array of objects, each with:
- day: number (1-7)
- title: string (content title/topic)
- platform: "Instagram" | "Facebook" | "TikTok" | "Email" | "LinkedIn"
- type: "Reel" | "Carousel" | "Static Post" | "Story" | "Email Newsletter"
- angle: string (the core message angle for this piece)
- targetAudience: string (who this is for: "young parents", "business owners", "seniors", etc.)

Focus on life insurance education, not sales. 7 items total.`;

  const items = await askClaudeJSON(SYSTEM, 'Create a high-converting weekly content calendar for a life insurance advisor.', 2000);

  // Add scheduled dates
  const result = (Array.isArray(items) ? items : items.calendar || []).map((item, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return { ...item, scheduledDate: date.toISOString().split('T')[0], status: 'Scheduled' };
  });

  logActivity('Marketing Team', `📅 Weekly calendar planned`, `${result.length} pieces`);
  return result;
}

// ─── Full Content Builder ─────────────────────────────────────────────────────

async function buildFullContent(item) {
  logActivity('Marketing Team', `✍️  Writing content`, `${item.type}: "${item.title}"`);

  let script = '';
  let hook = '';
  let hashtags = '';

  if (item.type === 'Reel') {
    const reel = await writeReelScript(item);
    script = reel.script;
    hook = reel.hook;
    hashtags = reel.hashtags;
  } else if (item.type === 'Carousel') {
    const carousel = await writeCarouselSlides(item);
    script = carousel.slides.map((s, i) => `[Slide ${i + 1}]\nTitle: ${s.title}\nBody: ${s.body}`).join('\n\n');
    hook = carousel.coverTitle;
    hashtags = carousel.hashtags;
  } else if (item.type === 'Email Newsletter') {
    const email = await writeEmailNewsletter(item);
    script = email.body;
    hook = email.subject;
    hashtags = '';
  } else {
    const post = await writeStaticPost(item);
    script = post.caption;
    hook = post.hook;
    hashtags = post.hashtags;
  }

  return {
    ...item,
    script,
    hook,
    hashtags,
  };
}

// ─── Reel Script Writer ───────────────────────────────────────────────────────

async function writeReelScript(item) {
  const SYSTEM = `You are a viral social media scriptwriter AND cinematic video director for life insurance content.
${BRAND_VOICE}

Write a 30-60 second Reel/TikTok script AND a cinematic video prompt for AI video generation.

Return JSON:
{
  "hook": string (first 3 seconds — must stop the scroll),
  "script": string (full caption/narration text),
  "hashtags": string (15-20 relevant hashtags),
  "duration": string (e.g. "30 seconds"),
  "videoPrompt": string (detailed cinematic visual description for AI video generation — describe scenes, visuals, lighting, mood, motion, style — NOT dialogue. Example: "Cinematic slow-motion shot of a young family laughing at a dinner table, warm golden-hour lighting, shallow depth of field, photorealistic, emotional atmosphere, life insurance advertisement style, 4K")
}`;

  return askClaudeJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}\nPlatform: ${item.platform}`,
    2000
  );
}

// ─── Carousel Builder ─────────────────────────────────────────────────────────

async function writeCarouselSlides(item) {
  const SYSTEM = `You are a carousel content designer for Instagram/Facebook.
${BRAND_VOICE}

Create a 5-7 slide carousel. Return JSON:
{
  "coverTitle": string (the hook that makes people swipe),
  "slides": [
    { "slideNumber": 1, "title": string, "body": string (2-3 lines max), "visualNote": string (what to show) }
  ],
  "hashtags": string (15-20 hashtags),
  "caption": string (post caption, 150-200 chars)
}

Make each slide a standalone value-bomb. Last slide = CTA.`;

  return askClaudeJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}`,
    2500
  );
}

// ─── Static Post Writer ───────────────────────────────────────────────────────

async function writeStaticPost(item) {
  const SYSTEM = `You are a social media copywriter for a life insurance advisor.
${BRAND_VOICE}

Write an engaging static post. Return JSON:
{
  "hook": string (first line — pattern interrupt),
  "caption": string (full post caption, 200-300 chars),
  "hashtags": string (15-20 hashtags),
  "imagePrompt": string (description for a graphic designer or AI image tool)
}`;

  return askClaudeJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}\nPlatform: ${item.platform}`,
    1500
  );
}

// ─── Email Newsletter Writer ──────────────────────────────────────────────────

async function writeEmailNewsletter(item) {
  const SYSTEM = `You are an email copywriter for a life insurance advisor.
${BRAND_VOICE}

Write a weekly newsletter email. Return JSON:
{
  "subject": string (compelling subject line, under 50 chars),
  "preheader": string (preview text, under 90 chars),
  "body": string (full email body, plain text, 300-500 words)
}

The email should educate, build trust, and have ONE soft CTA at the end.
Start with a personal story or relatable scenario.`;

  return askClaudeJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}`,
    2000
  );
}

// ─── HeyGen AI Video Generation ───────────────────────────────────────────────

async function maybeGenerateVideo(item) {
  const isVideoContent = item.type === 'Reel' || item.type === 'Story';
  if (!isVideoContent) return item;

  const hasAnyProvider = process.env.KIE_API_KEY || process.env.LUMA_API_KEY || process.env.RUNWAY_API_KEY;
  if (!hasAnyProvider) {
    logActivity('Marketing Team', `⚠️ No video provider configured — skipping video for "${item.title}". Add KIE_API_KEY, LUMA_API_KEY, or RUNWAY_API_KEY to Render.`);
    return item;
  }

  logActivity('Marketing Team', `🎬 Generating cinematic AI video`, `"${item.title}" — trying Kie.ai → Luma AI → Runway ML`);

  try {
    const prompt = buildCinematicPrompt(item);
    const { taskId, model, videoUrl } = await generateVideo({
      prompt,
      aspectRatio: '9:16',
    });

    logActivity('Marketing Team', `🎬 Video ready (${model})`, `"${item.title}" → ${videoUrl}`);
    return { ...item, videoUrl };
  } catch (err) {
    logActivity('Marketing Team', `⚠️ All video providers failed — saving content without video`, err.message);
    return item;
  }
}

function buildCinematicPrompt(item) {
  // Use the videoPrompt Claude wrote if available, otherwise craft one from title/angle
  if (item.videoPrompt) return item.videoPrompt.slice(0, 1000);

  const audience = item.targetAudience || 'families';
  const angle    = item.angle || 'life insurance protection';
  return `Cinematic life insurance advertisement. ${angle}. Target audience: ${audience}. ` +
    `Photorealistic, warm emotional lighting, shallow depth of field, slow cinematic motion. ` +
    `Professional ad quality, 4K, hopeful and trustworthy mood. ` +
    `Brand: Xpert Life Solutions — "Protecting Families. Building Legacies."`;
}

// ─── On-Demand Content ────────────────────────────────────────────────────────

export async function generateCustomContent(request) {
  logActivity('Marketing Team', `🎨 Custom content request`, request.slice(0, 80));

  const SYSTEM = `You are a content creation expert for ${BRAND_VOICE}
The user is requesting custom content. Analyze the request and create it.
Return a detailed content piece with hook, body, and CTA. Be specific and complete.`;

  const content = await askClaude(SYSTEM, request, 2000);
  logActivity('Marketing Team', `✅ Custom content generated`);
  return content;
}
