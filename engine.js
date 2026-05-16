'use strict';

import 'dotenv/config';
import { Client } from '@notionhq/client';

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const NOTION_API_KEY         = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID     = process.env.NOTION_DATABASE_ID;
const INSTAGRAM_API_BASE     = 'https://graph.instagram.com/v21.0';
const FIELDS                 = 'id,caption,media_url,permalink,timestamp,username';

// ---------------------------------------------------------------------------
// Guard — fail fast if env vars are missing
// ---------------------------------------------------------------------------
const missing = ['INSTAGRAM_ACCESS_TOKEN', 'NOTION_API_KEY', 'NOTION_DATABASE_ID']
  .filter(k => !process.env[k]);

if (missing.length) {
  console.error(`[Engine] ❌ Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Instagram — fetch all posts from the authenticated profile (auto-paginate)
// ---------------------------------------------------------------------------
async function fetchInstagramPosts() {
  const posts = [];
  let url = `${INSTAGRAM_API_BASE}/me/media?fields=${FIELDS}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;

  while (url) {
    const res  = await fetch(url);
    const body = await res.json();

    if (!res.ok) {
      throw new Error(`Instagram API error ${res.status}: ${JSON.stringify(body.error ?? body)}`);
    }

    posts.push(...(body.data ?? []));
    url = body.paging?.next ?? null;
  }

  return posts;
}

// ---------------------------------------------------------------------------
// Notion — collect every Post URL already in the database (auto-paginate)
// ---------------------------------------------------------------------------
async function getExistingUrls(notion) {
  const seen = new Set();
  let cursor;

  do {
    const res = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      page_size:   100,
      start_cursor: cursor,
    });

    for (const page of res.results) {
      const urlProp = page.properties?.['Post URL']?.url;
      if (urlProp) seen.add(urlProp);
    }

    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return seen;
}

// ---------------------------------------------------------------------------
// Notion — write one post as a new database page
// ---------------------------------------------------------------------------
async function addToNotion(notion, post) {
  const caption = post.caption ?? '';
  const title   = caption.length > 100
    ? caption.slice(0, 97) + '...'
    : caption || `Post by @${post.username}`;

  await notion.pages.create({
    parent: { database_id: NOTION_DATABASE_ID },
    cover:  post.media_url ? { type: 'external', external: { url: post.media_url } } : undefined,
    properties: {
      Name: {
        title: [{ text: { content: title } }],
      },
      'Post URL': {
        url: post.permalink,
      },
      Caption: {
        rich_text: [{ text: { content: caption.slice(0, 2000) } }],
      },
      Author: {
        rich_text: [{ text: { content: `@${post.username}` } }],
      },
      Thumbnail: {
        url: post.media_url ?? null,
      },
      'Posted At': {
        date: { start: post.timestamp },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  console.log('[Engine] 🚀 Instagram → Notion sync starting...');

  const notion = new Client({ auth: NOTION_API_KEY });

  console.log('[Engine] 📸 Fetching posts from Instagram...');
  const posts = await fetchInstagramPosts();
  console.log(`[Engine] Found ${posts.length} post(s) on Instagram`);

  console.log('[Engine] 📋 Loading existing posts from Notion...');
  const existing = await getExistingUrls(notion);
  console.log(`[Engine] Found ${existing.size} existing post(s) in Notion`);

  const newPosts = posts.filter(p => !existing.has(p.permalink));
  console.log(`[Engine] ✨ ${newPosts.length} new post(s) to sync`);

  if (newPosts.length === 0) {
    console.log('[Engine] ✅ Nothing to do — Notion is already up to date');
    return;
  }

  let added = 0;
  for (const post of newPosts) {
    try {
      await addToNotion(notion, post);
      console.log(`[Engine] ✅ Added: ${post.permalink}`);
      added++;
    } catch (err) {
      console.error(`[Engine] ❌ Failed to add ${post.permalink}: ${err.message}`);
    }
  }

  console.log(`[Engine] 🏁 Sync complete — ${added}/${newPosts.length} post(s) added to Notion`);
}

run().catch(err => {
  console.error('[Engine] 💥 Fatal error:', err.message);
  process.exit(1);
});
