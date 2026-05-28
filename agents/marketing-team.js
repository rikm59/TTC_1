'use strict';

/**
 * Marketing Team Agent
 * Runs Mon / Wed / Fri at 9 AM.
 * Creates complete content packages: video scripts, carousel slides,
 * caption copy, and hashtags — stored in the Notion content calendar.
 */

import { askPremium, askPremiumJSON } from '../integrations/claude-client.js';
import { createContentItem, logActivity, getAllContentItems, clearAndRebuildContentPage } from '../integrations/notion-crm.js';
import { generateVideo } from '../integrations/video-client.js';
import { generateSlideImage, generateCarouselSlideImages } from '../integrations/image-client.js';

const BRAND_VOICE = `You are writing content AS Rick, founder of Xpert Life Solutions — a licensed independent life insurance advisor based in Texas (also licensed in CA, FL, LA, OH, MI, VA, NC & WA).

RICK'S MISSION (use this as the emotional core of every piece):
"My personal mission is to make sure every family knows their options and has the right coverage in place — because when a loved one passes, the last thing a family should be dealing with is financial stress. I've seen what that moment looks like when a family is unprotected. That's why I do this."

RICK'S UNIQUE POSITION:
- Independent broker with access to an extensive portfolio of A-rated carriers — not captive to one company
- Serves ALL age groups, ALL income ranges, ALL health brackets — no one gets turned away without options
- Can often find coverage for people who've been told elsewhere they don't qualify
- Multi-state reach: TX, CA, FL, LA, OH, MI, VA, NC & WA — serves families coast to coast

VOICE & TONE RULES:
- Write in FIRST PERSON as Rick: "I've seen...", "When I sit down with families...", "In my experience...", "A client of mine recently..."
- Warm, direct, human — like a trusted friend who happens to know everything about life insurance
- Lead with EMOTION and EMPATHY — the coverage conversation is about love, not fear
- Educational first, never pushy — Rick's job is to inform, then let families decide
- No jargon. No corporate speak. Talk like a real Texan who genuinely cares.
- NEVER use these overused clichés: "coffee vs insurance", "lottery odds", "what would your family do without you" — Rick is more original than that
- Tagline: "Protecting Families. Building Legacies."`;

const AVOID_CLICHES = `
IMPORTANT — avoid these worn-out insurance content tropes that every agent already uses:
- "skip the latte and buy life insurance"
- "you insure your car but not your life"
- lottery/gambling comparisons
- vague fear-based urgency ("what if something happens tomorrow")
Instead: use SPECIFIC scenarios, REAL numbers, Rick's ADVISOR PERSPECTIVE (what he's seen in his career), and FRESH angles that make people stop and think.`;

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

  const SYSTEM = `You are a senior social media content strategist creating a content calendar for Rick at Xpert Life Solutions.
${BRAND_VOICE}
${AVOID_CLICHES}

Create a 7-day content calendar with exactly 7 items (one per day).
Distribute platforms: 2-3 Instagram, 2 Facebook, 1 TikTok, 1 Email Newsletter.
Distribute types: 2 Reels, 2 Carousels, 1 Static Post, 1 Story, 1 Email Newsletter.

Each piece should come from a DIFFERENT angle — no two pieces should feel similar. Draw from:
- Rick's advisor perspective ("something I see all the time with families...")
- Specific life stages: new parents, newlyweds, single-income households, business owners, people entering their 40s, divorced parents, people supporting aging parents
- Specific misconceptions Rick corrects as an expert (not generic ones)
- Real scenarios advisors encounter (without naming names)
- Texas + multi-state context where relevant

Return a JSON array of 7 objects, each with:
- day: number (1-7)
- title: string (specific, compelling content title — written as Rick would say it, not corporate)
- platform: "Instagram" | "Facebook" | "TikTok" | "Email" | "LinkedIn"
- type: "Reel" | "Carousel" | "Static Post" | "Story" | "Email Newsletter"
- angle: string (the specific emotional/educational angle — be precise and original)
- targetAudience: string (very specific — e.g. "single moms in their 30s earning $40–70K who assume they can't afford whole life")
- engagementHook: string (the one line that makes this specific audience stop scrolling — NO clichés)
- bestPostingTime: string (e.g. "Tuesday 7-9 PM")

7 items total. Every angle must be distinct.`;

  const items = await askPremiumJSON(SYSTEM, 'Create a high-converting weekly content calendar for a life insurance advisor. Return a JSON array of exactly 7 objects.', 4000);

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
    if (carousel.caption)       script += `\n\n[Caption]\n${carousel.caption}`;
    if (carousel.ctaSlideText)  script += `\n\n[CTA]\n${carousel.ctaSlideText}`;
    if (carousel.coverSubtitle) script += `\n\n[CoverSubtitle]\n${carousel.coverSubtitle}`;
    hook     = carousel.coverTitle;
    hashtags = carousel.hashtags;
    caption  = carousel.caption || '';
    item     = { ...item, coverSubtitle: carousel.coverSubtitle, ctaSlideText: carousel.ctaSlideText };

    // Generate branded PNG for every slide (reliable ffmpeg fallback, Cloudinary upload)
    try {
      const slideUrls = await generateCarouselSlideImages(slides);
      slides = slides.map((s, i) => ({ ...s, imageUrl: slideUrls[i] || '' }));
      logActivity('Marketing Team', `🖼️  Carousel slide images generated`, `${slideUrls.filter(Boolean).length}/${slides.length} slides`);
    } catch (err) {
      logActivity('Marketing Team', `⚠️  Carousel slide images failed`, err.message);
    }

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
  const SYSTEM = `You are writing an Instagram/Facebook Story for Rick at Xpert Life Solutions.
${BRAND_VOICE}
${AVOID_CLICHES}

Create a COMPLETE, ready-to-publish Story sequence. Stories are vertical (9:16), 15 seconds per frame, swipe-up/link sticker friendly.

Rick's Stories feel personal — quick, direct, like he's sharing something useful in real time. Use his advisor voice. Make the interactive element (poll or question sticker) something his audience will actually answer.

Return JSON:
{
  "hook": string (bold text on the first frame — under 8 words, stops the tap. Should feel like Rick is talking directly to this person),
  "script": string (complete frame-by-frame story flow: Frame 1 → Frame 2 → Frame 3 → CTA frame. Include what text appears on each frame and what the background visual is. Add relevant emoji.),
  "cta": string (the link sticker or swipe-up CTA — specific and low-pressure, e.g. "Tap to get your free coverage review 👆"),
  "imagePrompt": string (detailed visual for the background: setting, mood, lighting, photorealistic style — no text in the image),
  "videoPrompt": string (cinematic motion clip for animated background — describe movement, mood, lighting, emotional tone),
  "hashtags": string (5-8 hashtags relevant to the specific topic),
  "pollOrQuestion": string (a poll or question sticker that will actually get responses — make it specific to the audience's situation, not generic)
}`;

  return askPremiumJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}\nPlatform: ${item.platform}`,
    1500
  );
}

// ─── Reel Script Writer ───────────────────────────────────────────────────────

async function writeReelScript(item) {
  const SYSTEM = `You are writing a viral Reel/TikTok script that Rick from Xpert Life Solutions will film and post.
${BRAND_VOICE}
${AVOID_CLICHES}

Write a COMPLETE, production-ready 30-60 second Reel. Rick speaks directly to camera — conversational, warm, like texting a friend who asked a real question about life insurance.

The script MUST:
- Be written in Rick's first-person voice ("I work with families every week who...", "One thing I see constantly is...", "When I talk to parents about this...")
- Lead with a hook that earns the next 3 seconds — specific, unexpected, or emotionally true
- Include at least ONE moment where Rick shares something from his advisor experience (a scenario, a pattern he sees, something that surprises people)
- End with a low-pressure CTA that feels like an offer, not a pitch

Return JSON:
{
  "hook": string (first 3 seconds — one specific, punchy line that stops the scroll. Make it feel REAL, not salesy),
  "script": string (full word-for-word script Rick will say out loud. Sections: HOOK / PROBLEM / INSIGHT / SOLUTION / CTA — each labeled. Written the way Rick actually talks — not corporate, not scripted-sounding),
  "onScreenText": string (the exact text overlays to display on screen, line by line — short phrases that reinforce what Rick is saying),
  "cta": string (specific low-pressure CTA, e.g. "Comment 'REVIEW' and I'll walk you through your options for free — no obligation"),
  "hashtags": string (20 hashtags — a mix of broad reach and niche audience tags relevant to the specific topic),
  "duration": string (e.g. "45 seconds"),
  "filmingNotes": string (specific shot direction for Rick filming solo on his phone: exact setting, lighting setup, what to wear, any props, camera angles — practical and specific),
  "videoPrompt": string (cinematic AI video prompt for the B-roll background — describe the visual scene, lighting, emotion, motion. Minimum 100 words. Should match the emotional tone of the script. No text, no dialogue.)
}`;

  return askPremiumJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}\nPlatform: ${item.platform}`,
    2000
  );
}

// ─── Carousel Builder ─────────────────────────────────────────────────────────

async function writeCarouselSlides(item) {
  const SYSTEM = `You are writing an Instagram carousel that Rick from Xpert Life Solutions will post.
${BRAND_VOICE}
${AVOID_CLICHES}

Create a COMPLETE, ready-to-design 6-slide carousel. Every field fully written — no placeholders.

Rick's carousels feel like advice from a knowledgeable friend, not a corporate brochure. Each slide should deliver ONE clear piece of value — a surprising fact, a practical tip, a misconception corrected, a real scenario from Rick's advisory experience. Readers should feel smarter after each swipe.

Design language: Navy (#0B1F3A) backgrounds, gold (#C9A84C) headlines, clean white body text, modern sans-serif. Brand mark "Xpert Life Solutions" on the cover and final slide.

Return JSON:
{
  "coverTitle": string (the cover hook — bold, specific, creates genuine curiosity. Should feel like Rick is letting you in on something most people don't know),
  "coverSubtitle": string (one line that builds on the cover title — tells the reader exactly what they'll learn by swiping),
  "slides": [
    {
      "slideNumber": number,
      "title": string (bold headline — short, punchy, under 8 words. Should stand alone as a shareable insight),
      "body": string (3-5 complete sentences. Real value — a specific insight, statistic, or scenario from Rick's experience. Written in Rick's voice where appropriate. No filler.),
      "visualNote": string (art direction: exact background, any photo/icon, layout — specific enough to execute immediately),
      "designStyle": string (e.g. "Navy #0B1F3A background, gold #C9A84C headline, white body, left-aligned text block, lifestyle photo right side")
    }
  ],
  "hashtags": string (20 hashtags — broad life insurance + niche audience for this specific topic),
  "caption": string (complete ready-to-post caption written as Rick. Hook + 2-3 sentences + CTA. 200-250 chars.),
  "ctaSlideText": string (final slide CTA — specific and low-pressure, e.g. "DM me 'REVIEW' and I'll look at your current coverage for free — no strings attached")
}

Slide structure: Cover → Problem/Why it matters → Insight 1 → Insight 2 → Solution/What to do → CTA.
Every slide must deliver standalone value. No slide should feel like filler.`;

  return askPremiumJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}`,
    2500
  );
}

// ─── Static Post Writer ───────────────────────────────────────────────────────

async function writeStaticPost(item) {
  const SYSTEM = `You are writing a static image post for Rick at Xpert Life Solutions.
${BRAND_VOICE}
${AVOID_CLICHES}

Write a COMPLETE, ready-to-post caption and graphic brief. Rick's static posts are short, punchy, and feel like advice from a real person — not an ad.

Return JSON:
{
  "hook": string (first line — a specific, original statement or question that makes the target audience stop. Under 10 words. No clichés.),
  "caption": string (complete caption written as Rick. Hook + 2-3 sentences of real value from his advisor perspective + CTA. 250-350 chars. Reads like a human, not a brand.),
  "cta": string (low-pressure specific CTA that feels natural, e.g. "DM me 'CHECK' and I'll take a look at your current coverage for free"),
  "hashtags": string (20 hashtags — mix of broad reach and specific niche for this audience),
  "imagePrompt": string (detailed AI image generation brief: subject, setting, lighting, mood, photorealistic style, emotional tone — no text in the image. Minimum 50 words.),
  "designNotes": string (graphic design brief: background, font choices, color use from brand palette Navy #0B1F3A / Gold #C9A84C, layout, what text overlay goes on the graphic)
}`;

  return askPremiumJSON(SYSTEM,
    `Topic: ${item.title}\nAngle: ${item.angle}\nAudience: ${item.targetAudience}\nPlatform: ${item.platform}`,
    1500
  );
}

// ─── Email Newsletter Writer ──────────────────────────────────────────────────

async function writeEmailNewsletter(item) {
  const SYSTEM = `You are writing a weekly newsletter email that Rick from Xpert Life Solutions sends to his list.
${BRAND_VOICE}
${AVOID_CLICHES}

Rick's emails feel like a personal note from a trusted advisor — not a marketing blast. He writes the way he talks: warm, direct, a little Texas in there. He shares one real insight per email, usually tied to something he sees constantly as an independent broker serving families across TX, CA, FL and beyond.

The email should:
- Open with something personal or a real scenario Rick encountered (without naming clients)
- Share ONE genuinely useful insight the reader didn't know before
- Make the reader feel Rick is looking out for them, not selling them something
- Close with a soft, specific invitation to connect

Return JSON:
{
  "subject": string (subject line under 50 chars — feels personal, not promotional. Like a friend emailing, not a brand),
  "preheader": string (preview text under 90 chars — draws the reader in, finishes the thought from the subject),
  "greeting": string (Rick's natural opening — warm, e.g. "Hey [First Name] —"),
  "body": string (complete email body, 350-500 words. Plain text, line breaks between paragraphs. Rick's voice throughout. Structure: opening hook or story → the insight → practical takeaway → soft CTA. No bullet points, no headers — just Rick writing like a human.),
  "cta": string (the closing invitation — specific and no-pressure, e.g. "If you want to know where you stand, reply to this email or grab 15 minutes on my calendar: [BOOKING LINK]"),
  "ps": string (P.S. — a second warm touch: a curiosity hook, a quick tip, or an invitation to reply with a question)
}`;

  return askPremiumJSON(SYSTEM,
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

// ─── Regenerate a Single Content Item ────────────────────────────────────────

export async function regenerateContentItem(item) {
  // Ensure angle/targetAudience exist so AI writers don't receive "undefined"
  const enriched = {
    angle:          item.title,
    targetAudience: 'young families and parents aged 25–45',
    ...item,
  };
  const full      = await buildFullContent(enriched);
  const withVideo = await maybeGenerateVideo(full);
  await clearAndRebuildContentPage(item.id, withVideo);
  logActivity('Marketing Team', `✅ Regenerated`, `"${item.title}"${withVideo.videoUrl ? ' + video' : withVideo.imageUrl ? ' + image' : ''}`);
  return withVideo;
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

  const content = await askPremium(SYSTEM, request, 2000);
  logActivity('Marketing Team', `✅ Custom content generated`);
  return content;
}
