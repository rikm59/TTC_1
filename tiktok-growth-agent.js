'use strict';

import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@notionhq/client';

const TIKTOK_GOAL = 18000;

const BUSINESS_CONTEXT = `
TexTop Choice is a Texas-based home refresh company:
- Services: Cabinet painting & refinishing, Interior & exterior painting, Custom built cabinets, Trim & finish work, Home repair & remodeling
- Signature offer: 5-Day Kitchen Refresh (full kitchen transformation in under a week)
- Owner: Alma Martin | Phone: (817) 809-6327 | Email: alma.martin@textopchoice.com
- Location: Texas (DFW area)
- Target audience: Texas homeowners updating kitchens, new home buyers, sellers prepping to list, realtors & property managers
- Brand voice: Warm, trustworthy, expert, results-focused — never corporate or salesy
- Core message: Transform your home without the cost of a full renovation
`;

// ---------------------------------------------------------------------------
// Validate required env vars
// ---------------------------------------------------------------------------
function validateEnv() {
  const required = [
    'ANTHROPIC_API_KEY',
    'NOTION_API_KEY',
    'NOTION_TIKTOK_CONTENT_DATABASE_ID',
    'NOTION_TIKTOK_TRACKER_DATABASE_ID',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`[TikTok Agent] Missing env vars: ${missing.join(', ')}`);
  }
}

function makeClients() {
  return {
    anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
    notion: new Client({ auth: process.env.NOTION_API_KEY }),
  };
}

// ---------------------------------------------------------------------------
// Agent 1: Content Idea & Script Generator
// Generates a full 7-day content calendar with hooks, scripts, and tips
// ---------------------------------------------------------------------------
async function generateWeeklyContent(anthropic, weekStartDate) {
  const weekLabel = weekStartDate.toLocaleDateString('en-US', {
    weekday: undefined,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  console.log(`[Content Agent] Generating 7-day content plan for week of ${weekLabel}...`);

  const prompt = `You are a TikTok growth strategist for home renovation small businesses with a proven track record of growing accounts from 0 to 100k.

BUSINESS:
${BUSINESS_CONTEXT}

TASK: Create a 7-day TikTok content calendar for the week of ${weekLabel}.

CONTENT TYPE ROTATION (use this exact mix):
- Monday: Before/After Reveal (highest viral potential, start the week strong)
- Tuesday: Quick Tips (3-5 actionable tips homeowners wish they knew)
- Wednesday: Cost Breakdown (transparent pricing — wildly engaging for homeowners)
- Thursday: Behind the Scenes (authentic process footage, builds trust)
- Friday: Client Story or Transformation Reveal (social proof before the weekend)
- Saturday: Myth Busting (debunk a common home renovation belief)
- Sunday: Educational (teach one thing about cabinets, paint, or home value)

For each day produce:
1. title: Catchy video title/concept (specific, not generic)
2. hook: The first 3 seconds of the video (must STOP the scroll — use bold claims, shocking reveals, or strong curiosity gaps)
3. script: Full video script 150-250 words. Conversational TikTok tone. Add [VISUAL CUE: description] notes for what to film. End with a soft CTA (follow, comment question, or "link in bio for a free quote").
4. hashtags: Array of 12 hashtags (3 high-volume 1M+, 5 mid-range 100k-1M, 4 niche/local Texas tags)
5. postingTime: Best time to post in CST (based on home/DIY content engagement patterns)
6. growthTip: One specific action to boost this video beyond just posting it

Return ONLY valid JSON, no markdown fences:
{
  "week": "${weekLabel}",
  "posts": [
    {
      "day": "Monday",
      "contentType": "Before/After Reveal",
      "title": "...",
      "hook": "...",
      "script": "...",
      "hashtags": ["#tag1", "#tag2"],
      "postingTime": "7:00 PM CST",
      "growthTip": "..."
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON for weekly content');

  return JSON.parse(jsonMatch[0]);
}

// ---------------------------------------------------------------------------
// Agent 2: Hashtag & Trend Strategist
// Produces a comprehensive hashtag map and engagement guidance
// ---------------------------------------------------------------------------
async function generateHashtagStrategy(anthropic) {
  console.log('[Hashtag Agent] Building hashtag & trend strategy...');

  const prompt = `You are a TikTok SEO specialist for home renovation content.

BUSINESS:
${BUSINESS_CONTEXT}

Generate a complete hashtag and trend strategy for TexTop Choice's TikTok account.

Return ONLY valid JSON:
{
  "coreBrandHashtags": ["5 hashtags to use on every single video"],
  "highVolumeHashtags": ["5 tags with 1M+ views for broad reach"],
  "midRangeHashtags": ["10 tags with 100k-1M views, targeted to home reno"],
  "nicheLocalHashtags": ["8 niche/Texas-specific tags under 100k views, high conversion intent"],
  "trendingSoundStrategy": "2-3 sentence guide on what types of trending TikTok audio to pair with home reno content",
  "bestPostingTimes": ["Top 3 specific times in CST for home/DIY TikTok content with reasoning"],
  "engagementHooks": ["7 scroll-stopping opening phrases or sentences specific to home renovation"],
  "commentEngagementTips": ["5 tactics for boosting comments and saves on each video"],
  "weeklyGrowthActions": ["5 non-posting actions to take each week to grow followers (engagement pods, duets, etc.)"]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON for hashtag strategy');

  return JSON.parse(jsonMatch[0]);
}

// ---------------------------------------------------------------------------
// Notion — save weekly content calendar
// ---------------------------------------------------------------------------
async function saveWeeklyContentToNotion(notion, weeklyContent) {
  const dbId = process.env.NOTION_TIKTOK_CONTENT_DATABASE_ID;
  let saved = 0;

  for (const post of weeklyContent.posts) {
    try {
      await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          Name:           { title:     [{ text: { content: post.title } }] },
          Day:            { select:    { name: post.day } },
          Week:           { rich_text: [{ text: { content: weeklyContent.week } }] },
          'Content Type': { select:    { name: post.contentType } },
          Hook:           { rich_text: [{ text: { content: post.hook } }] },
          Script:         { rich_text: [{ text: { content: post.script.slice(0, 2000) } }] },
          Hashtags:       { rich_text: [{ text: { content: post.hashtags.join(' ') } }] },
          'Posting Time': { rich_text: [{ text: { content: post.postingTime } }] },
          'Growth Tip':   { rich_text: [{ text: { content: post.growthTip } }] },
          Status:         { select:    { name: 'Idea' } },
        },
      });
      console.log(`[Content Agent] ✅ Saved: ${post.day} — ${post.title}`);
      saved++;
    } catch (err) {
      console.error(`[Content Agent] ❌ Failed to save ${post.day}: ${err.message}`);
    }
  }

  return saved;
}

// ---------------------------------------------------------------------------
// Notion — save hashtag strategy as a single page
// ---------------------------------------------------------------------------
async function saveHashtagStrategyToNotion(notion, strategy) {
  const dbId = process.env.NOTION_TIKTOK_CONTENT_DATABASE_ID;
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const allHashtags = [
    `CORE (always use): ${strategy.coreBrandHashtags?.join(' ')}`,
    `HIGH VOLUME: ${strategy.highVolumeHashtags?.join(' ')}`,
    `MID RANGE: ${strategy.midRangeHashtags?.join(' ')}`,
    `NICHE/LOCAL: ${strategy.nicheLocalHashtags?.join(' ')}`,
  ].join('\n\n');

  const growthContent = [
    `TRENDING SOUND STRATEGY:\n${strategy.trendingSoundStrategy}`,
    `BEST POSTING TIMES:\n${strategy.bestPostingTimes?.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
    `COMMENT ENGAGEMENT TIPS:\n${strategy.commentEngagementTips?.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
    `WEEKLY GROWTH ACTIONS:\n${strategy.weeklyGrowthActions?.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
  ].join('\n\n');

  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:           { title:     [{ text: { content: `Hashtag Strategy — ${today}` } }] },
      Day:            { select:    { name: 'Monday' } },
      Week:           { rich_text: [{ text: { content: today } }] },
      'Content Type': { select:    { name: 'Hashtag Strategy' } },
      Hook:           { rich_text: [{ text: { content: strategy.engagementHooks?.join('\n') ?? '' } }] },
      Script:         { rich_text: [{ text: { content: growthContent.slice(0, 2000) } }] },
      Hashtags:       { rich_text: [{ text: { content: allHashtags.slice(0, 2000) } }] },
      'Posting Time': { rich_text: [{ text: { content: strategy.bestPostingTimes?.[0] ?? '' } }] },
      'Growth Tip':   { rich_text: [{ text: { content: strategy.weeklyGrowthActions?.[0] ?? '' } }] },
      Status:         { select:    { name: 'Strategy' } },
    },
  });

  console.log('[Hashtag Agent] ✅ Hashtag strategy saved to Notion');
}

// ---------------------------------------------------------------------------
// Agent 3: Follower Progress Tracker
// Logs current follower count and calculates trajectory to 18k goal
// ---------------------------------------------------------------------------
async function logFollowerCount(notion, currentFollowers, notes = '') {
  const dbId = process.env.NOTION_TIKTOK_TRACKER_DATABASE_ID;
  const today = new Date().toISOString().split('T')[0];
  const progress = parseFloat(((currentFollowers / TIKTOK_GOAL) * 100).toFixed(1));
  const remaining = TIKTOK_GOAL - currentFollowers;

  console.log(`[Tracker Agent] Logging ${currentFollowers.toLocaleString()} followers...`);

  // Get previous entry to calculate weekly growth
  let weeklyGrowth = null;
  try {
    const prev = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 1,
    });
    if (prev.results.length > 0) {
      const prevCount = prev.results[0].properties?.['Follower Count']?.number ?? 0;
      weeklyGrowth = currentFollowers - prevCount;
    }
  } catch {
    // ignore — first entry
  }

  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:               { title:     [{ text: { content: `${today} — ${currentFollowers.toLocaleString()} followers` } }] },
      'Follower Count':   { number:    currentFollowers },
      Goal:               { number:    TIKTOK_GOAL },
      'Progress %':       { number:    progress },
      'Remaining to Goal':{ number:    remaining },
      Date:               { date:      { start: today } },
      'Weekly Growth':    { number:    weeklyGrowth ?? 0 },
      Notes:              { rich_text: [{ text: { content: notes } }] },
    },
  });

  const weeksToGoal = weeklyGrowth && weeklyGrowth > 0
    ? Math.ceil(remaining / weeklyGrowth)
    : null;

  console.log(`[Tracker Agent] ✅ ${progress}% to goal (${currentFollowers.toLocaleString()} / ${TIKTOK_GOAL.toLocaleString()})`);
  if (weeklyGrowth !== null) console.log(`[Tracker Agent] 📈 Growth since last log: +${weeklyGrowth} followers`);
  if (weeksToGoal)           console.log(`[Tracker Agent] 🎯 Estimated weeks to 18k: ~${weeksToGoal} weeks`);

  return { currentFollowers, goal: TIKTOK_GOAL, progress, remaining, weeklyGrowth, weeksToGoal };
}

// ---------------------------------------------------------------------------
// Main orchestrator — called by agent-manager or directly
// ---------------------------------------------------------------------------
async function run(options = {}) {
  validateEnv();
  const { anthropic, notion } = makeClients();

  const {
    currentFollowers = null,
    followerNotes    = '',
    includeHashtags  = false,
    skipContent      = false,
  } = options;

  console.log('\n[TikTok Agent] 🚀 TexTop Choice TikTok Growth Agent starting...');
  console.log(`[TikTok Agent] Goal: ${TIKTOK_GOAL.toLocaleString()} followers`);

  const results = {};

  // Follower tracking
  if (currentFollowers !== null && currentFollowers > 0) {
    results.tracker = await logFollowerCount(notion, currentFollowers, followerNotes);
  }

  // Hashtag strategy report (run on demand)
  if (includeHashtags) {
    const strategy = await generateHashtagStrategy(anthropic);
    await saveHashtagStrategyToNotion(notion, strategy);

    console.log('\n[Hashtag Agent] 📌 Strategy Summary:');
    console.log('  Core tags:', strategy.coreBrandHashtags?.join(' '));
    console.log('  Best times:', strategy.bestPostingTimes?.join(' | '));
    results.hashtags = strategy;
  }

  // Weekly content generation
  if (!skipContent) {
    const weekStart = new Date();
    // Snap to Monday of current week
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);

    const weeklyContent = await generateWeeklyContent(anthropic, weekStart);
    const saved = await saveWeeklyContentToNotion(notion, weeklyContent);

    console.log(`\n[TikTok Agent] 🏁 ${saved}/7 posts saved to Notion content calendar`);
    console.log('[TikTok Agent] Next steps:');
    console.log('  1. Open your Notion "TikTok Content Calendar" database');
    console.log('  2. Review scripts, tweak to your voice, mark "Script Ready"');
    console.log('  3. Film content and mark "Filmed"');
    console.log('  4. Post at the recommended CST times for max reach');
    console.log('  5. Log your follower count weekly via POST /v1/tiktok/log-followers');

    results.content = { week: weeklyContent.week, saved };
  }

  return results;
}

export { run, logFollowerCount, generateHashtagStrategy };
