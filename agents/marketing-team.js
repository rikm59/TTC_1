'use strict';

/**
 * Marketing Team Agent
 * Runs Mon / Wed / Fri at 9 AM.
 * Creates complete content packages: video scripts, carousel slides,
 * caption copy, and hashtags — stored in the Notion content calendar.
 */

import { askClaude, askClaudeJSON } from '../integrations/claude-client.js';
import { createContentItem, logActivity, getAllContentItems, clearAndRebuildContentPage } from '../integrations/notion-crm.js';
import { generateVideo } from '../integrations/video-client.js';
import { generateSlideImage } from '../integrations/image-client.js';

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

  const SYSTEM = `You are a senior social media content strategist for a life insurance business.
${BRAND_VOICE}

Create a 7-day content calendar with exactly 7 items (one per day).
Distribute platforms: 2-3 Instagram, 2 Facebook, 1 TikTok, 1 Email Newsletter.
Distribute types: 2 Reels, 2 Carousels, 1 Static Post, 1 Story, 1 Email Newsletter.

Return a JSON array of 7 objects, each with:
- day: number (1-7)
- title: string (specific, compelling content title)
- platform: "Instagram" | "Facebook" | "TikTok" | "Email" | "LinkedIn"
- type: "Reel" | "Carousel" | "Static Post" | "Story" | "Email Newsletter"
- angle: string (the specific emotional/educational angle — be precise, e.g. "The hidden cost of waiting to buy life insurance until your 40s")
- targetAudience: string (very specific — e.g. "new parents under 35 who haven't bought life insurance yet")
- engagementHook: string (the one question or statement that will make this audience stop scrolling)
- bestPostingTime: string (e.g. "Tuesday 7-9 PM" — when this audience is most active)

Prioritize emotional resonance and education over sales. 7 items total.`;

  const items = await askClaudeJSON(SYSTEM, 'Create a high-converting weekly content calendar for a life insurance advisor. Return a JSON array of exactly 7 objects.', 4000);

  // Add scheduled dates
  const calArray = Array.isArray(items) ? items : items.calendar || items.items || [];
  if (!calArray.length) throw new Error('AI returned empty content calendar — check API key and try again');
  const result = calArray.map((item, i) => {
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

  let script = '', hook = '', hashtags = '';
  let slides = null, caption = '', imageUrl = null;

  if (item.type === 'Reel') {
    const reel = await writeReelScript(item);
    script   = [
      reel.script,
      reel.onScreenText ? `\n\n--- ON SCREEN TEXT ---\n${reel.onScreenText}` : '',
      reel.filmingNotes ? `\n\n--- FILMING NOTES ---\n${reel.filmingNotes}` : '',
      reel.cta          ? `\n\n--- CTA ---\n${reel.cta}` : '',
    ].filter(Boolean).join('');
    hook     = reel.hook;
    hashtags = reel.hashtags;
    item     = { ...item, videoPrompt: reel.videoPrompt };
  } else if (item.type === 'Story') {
    const story = await writeStoryContent(item);
    script   = story.script;
    hook     = story.hook;
    hashtags = story.hashtags || '';
    imageUrl = await maybeGenerateCoverImage(story.imagePrompt || item.angle, item.title);
    item     = { ...item, videoPrompt: story.videoPrompt };
  } else if (item.type === 'Carousel') {
    const carousel = await writeCarouselSlides(item);
    slides   = carousel.slides;
    script   = slides.map((s, i) =>
      `[Slide ${i + 1}]\nTitle: ${s.title}\nBody: ${s.body}\nDesign: ${s.designStyle || s.visualNote || ''}`
    ).join('\n\n');
    hook     = carousel.coverTitle;
    hashtags = carousel.hashtags;
    caption  = carousel.caption || '';
    // attach extra fields for Notion page layout
    item     = { ...item, coverSubtitle: carousel.coverSubtitle, ctaSlideText: carousel.ctaSlideText };
    imageUrl = await maybeGenerateCoverImage(slides[0]?.visualNote || item.angle, item.title);
  } else if (item.type === 'Email Newsletter') {
    const email = await writeEmailNewsletter(item);
    script = [
      email.greeting ? `${email.greeting}\n\n` : '',
      email.body,
      email.cta  ? `\n\n${email.cta}` : '',
      email.ps   ? `\n\nP.S. ${email.ps}` : '',
    ].filter(Boolean).join('');
    hook   = email.subject;
  } else {
    const post = await writeStaticPost(item);
    script   = [post.caption, post.cta ? `\n\n${post.cta}` : ''].filter(Boolean).join('');
    hook     = post.hook;
    hashtags = post.hashtags;
    item     = { ...item, designNotes: post.designNotes };
    imageUrl = await maybeGenerateCoverImage(post.imagePrompt || item.angle, item.title);
  }

  return { ...item, script, hook, hashtags, slides, caption, imageUrl };
}

async function maybeGenerateCoverImage(visualPrompt, title) {
  if (!visualPrompt) return null;
  try {
    const url = await generateSlideImage({ prompt: visualPrompt });
    if (url) logActivity('Marketing Team', `🖼️  Cover image generated`, title);
    return url;
  } catch (err) {
    logActivity('Marketing Team', `⚠️  Cover image failed`, err.message);
    return null;
  }
}

// ─── Story Writer ─────────────────────────────────────────────────────────────

async function writeStoryContent(item) {
  const SYSTEM = `You are a social media story designer for a life insurance advisor.
${BRAND_VOICE}

Create a COMPLETE, ready-to-publish Instagram/Facebook Story. Stories are vertical (9:16), 15 seconds, swipe-up friendly.

Return JSON:
{
  "hook": string (the bold text overlay on the first frame — under 8 words, high contrast),
  "script": string (the full story flow: Frame 1 text → Frame 2 text → Frame 3 text → CTA frame. Include emoji for energy.),
  "cta": string (the swipe-up or link sticker CTA, e.g. "Swipe up for your free quote 👆"),
  "imagePrompt": string (detailed visual for the background image: setting, lighting, mood, photorealistic style — no text),
  "videoPrompt": string (cinematic motion video prompt if animating — describe movement, mood, lighting),
  "hashtags": string (5-8 story hashtags),
  "pollOrQuestion": string (optional interactive element: poll question or question sticker text to boost engagement)
}`;

  return askClaudeJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}\nPlatform: ${item.platform}`,
    1500
  );
}

// ─── Reel Script Writer ───────────────────────────────────────────────────────

async function writeReelScript(item) {
  const SYSTEM = `You are a viral short-form video director and scriptwriter for life insurance content.
${BRAND_VOICE}

Write a COMPLETE, production-ready 30-60 second Reel/TikTok. Every field must be fully written — no placeholders.

Return JSON:
{
  "hook": string (first 3 seconds on screen — one punchy line that stops the scroll cold),
  "script": string (full word-for-word narration/caption, split into clear sections: HOOK / PROBLEM / INSIGHT / SOLUTION / CTA — each labeled),
  "onScreenText": string (the exact text overlays to show on screen, line by line),
  "cta": string (exact call-to-action text for end of video, e.g. "Comment PROTECT below for a free quote"),
  "hashtags": string (20 relevant hashtags, a mix of broad and niche),
  "duration": string (e.g. "45 seconds"),
  "filmingNotes": string (specific shot direction: angles, props, setting, clothing — written for someone filming on a phone),
  "videoPrompt": string (detailed cinematic visual description for AI video generation — describe scenes, visuals, lighting, mood, motion, style — NOT dialogue. Minimum 100 words. Example: "Cinematic slow-motion shot of a young family laughing at a dinner table, warm golden-hour lighting, shallow depth of field, photorealistic, emotional atmosphere, life insurance advertisement style, 4K")
}`;

  return askClaudeJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}\nPlatform: ${item.platform}`,
    2000
  );
}

// ─── Carousel Builder ─────────────────────────────────────────────────────────

async function writeCarouselSlides(item) {
  const SYSTEM = `You are a senior Instagram carousel designer and copywriter for a life insurance brand.
${BRAND_VOICE}

Create a COMPLETE, ready-to-design 6-slide carousel. Every field must be fully written — no placeholders, no "insert text here."

Return JSON:
{
  "coverTitle": string (the scroll-stopping hook on the cover slide — bold, specific, creates curiosity),
  "coverSubtitle": string (one supporting line under the cover title),
  "slides": [
    {
      "slideNumber": number,
      "title": string (bold headline for this slide — short, punchy, under 8 words),
      "body": string (3-5 complete sentences of value — a real insight, stat, or story the reader can act on),
      "visualNote": string (detailed art direction: background color/image, icons, photo style — specific enough for a designer to execute immediately),
      "designStyle": string (e.g. "Navy background #0A2342, gold headline text #C9A84C, white body text, left-aligned, family photo on right")
    }
  ],
  "hashtags": string (20 hashtags — mix of broad life insurance tags and niche audience tags),
  "caption": string (complete ready-to-post caption, 200-250 chars, includes the hook and a CTA),
  "ctaSlideText": string (the exact call-to-action for the final slide — be specific, e.g. "DM me the word READY for a free 10-minute coverage review")
}

Slide structure: Cover → Problem → Insight → Solution → Proof/Stats → CTA.
Last slide = strong, specific call-to-action. Every slide must deliver standalone value.`;

  return askClaudeJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}`,
    2500
  );
}

// ─── Static Post Writer ───────────────────────────────────────────────────────

async function writeStaticPost(item) {
  const SYSTEM = `You are a senior social media copywriter for a life insurance advisor.
${BRAND_VOICE}

Write a COMPLETE, ready-to-post static image post. Every field must be fully written — no placeholders.

Return JSON:
{
  "hook": string (first line — bold pattern interrupt that stops the scroll, under 10 words),
  "caption": string (complete ready-to-post caption: hook + 3-4 sentences of value + CTA. 250-350 chars total),
  "cta": string (specific call-to-action, e.g. "Drop a ❤️ if this resonates, and DM me 'QUOTE' for a free review"),
  "hashtags": string (20 hashtags — broad + niche mix),
  "imagePrompt": string (detailed visual description for AI image generation: subject, setting, lighting, mood, style, brand colors. Minimum 50 words. No text in image.),
  "designNotes": string (specific art direction: font style, color palette, layout, overlay text to show on the graphic)
}`;

  return askClaudeJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}\nPlatform: ${item.platform}`,
    1500
  );
}

// ─── Email Newsletter Writer ──────────────────────────────────────────────────

async function writeEmailNewsletter(item) {
  const SYSTEM = `You are a senior email copywriter for a life insurance advisor.
${BRAND_VOICE}

Write a COMPLETE, ready-to-send weekly newsletter email. Every field must be fully written.

Return JSON:
{
  "subject": string (compelling subject line under 50 chars — curiosity or benefit-driven, no clickbait),
  "preheader": string (preview text under 90 chars — extends the subject, teases the content),
  "greeting": string (warm personalized opening, e.g. "Hey [First Name],"),
  "body": string (complete email body, 400-600 words, plain text with line breaks between paragraphs — structure: personal story or scenario → key insight → practical tip → soft CTA),
  "cta": string (the specific call-to-action line at the end — link text and what to click, e.g. "Click here to get your free coverage review → [BOOKING LINK]"),
  "ps": string (P.S. line — a second softer CTA or curiosity hook that drives replies)
}

Write as Rick from Xpert Life Solutions — warm, personal, like a trusted advisor writing to a friend.
One core idea per email. No jargon. End with ONE clear action.`;

  return askClaudeJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}`,
    2000
  );
}

// ─── HeyGen AI Video Generation ───────────────────────────────────────────────

async function maybeGenerateVideo(item) {
  const isVideoContent = item.type === 'Reel' || item.type === 'Story';
  if (!isVideoContent) return item;

  logActivity('Marketing Team', `🎬 Generating video`, `"${item.title}" — Kie.ai → Replicate → Fal.ai → Luma → Remotion`);

  try {
    const prompt = buildCinematicPrompt(item);
    const { taskId, model, videoUrl } = await generateVideo({
      prompt,
      aspectRatio: '9:16',
      contentItem: item,
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

// ─── Redo All Existing Content ────────────────────────────────────────────────

export async function redoAllContent() {
  const items = await getAllContentItems(100);
  logActivity('Marketing Team', `🔄 Redoing all content`, `${items.length} items found`);

  let done = 0;
  let failed = 0;

  for (const item of items) {
    try {
      logActivity('Marketing Team', `✍️  Regenerating`, `${item.type}: "${item.title}"`);
      const full     = await buildFullContent(item);
      const withVideo = await maybeGenerateVideo(full);
      await clearAndRebuildContentPage(item.id, withVideo);
      logActivity('Marketing Team', `✅ Redone`, `"${item.title}"${withVideo.videoUrl ? ' + video' : withVideo.imageUrl ? ' + image' : ''}`);
      done++;
    } catch (err) {
      logActivity('Marketing Team', `❌ Redo failed`, `"${item.title}" — ${err.message}`);
      failed++;
    }
  }

  logActivity('Marketing Team', `🏁 Redo complete`, `${done} redone, ${failed} failed`);
  return { done, failed, total: items.length };
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
