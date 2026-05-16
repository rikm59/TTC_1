'use strict';

import 'dotenv/config';
import { Client } from '@notionhq/client';

const INSTAGRAM_ACCESS_TOKEN         = process.env.INSTAGRAM_ACCESS_TOKEN;
const NOTION_API_KEY                 = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID             = process.env.NOTION_DATABASE_ID;
const NOTION_ACCOUNTS_DATABASE_ID    = process.env.NOTION_ACCOUNTS_DATABASE_ID;
const FACEBOOK_API_BASE              = 'https://graph.facebook.com/v21.0';

// ---------------------------------------------------------------------------
// Guard — fail fast if env vars are missing
// ---------------------------------------------------------------------------
const missing = [
  'INSTAGRAM_ACCESS_TOKEN',
  'NOTION_API_KEY',
  'NOTION_DATABASE_ID',
  'NOTION_ACCOUNTS_DATABASE_ID',
].filter(k => !process.env[k]);

if (missing.length) {
  console.error(`[Engine] ❌ Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Instagram — auto-discover the authenticated user's IG Business Account ID
// Walks: token → Facebook Pages → instagram_business_account
// ---------------------------------------------------------------------------
async function getIgBusinessAccountId() {
  const pagesRes  = await fetch(`${FACEBOOK_API_BASE}/me/accounts?access_token=${INSTAGRAM_ACCESS_TOKEN}`);
  const pagesBody = await pagesRes.json();
  if (!pagesRes.ok) throw new Error(`/me/accounts error: ${JSON.stringify(pagesBody.error ?? pagesBody)}`);

  const pages = pagesBody.data ?? [];
  if (pages.length === 0) throw new Error('No Facebook Pages found for this token. Make sure your Facebook Page is connected to an Instagram Business account.');

  console.log(`[Engine] Found ${pages.length} Facebook Page(s): ${pages.map(p => p.name ?? p.id).join(', ')}`);

  for (const page of pages) {
    const igRes  = await fetch(`${FACEBOOK_API_BASE}/${page.id}?fields=instagram_business_account&access_token=${INSTAGRAM_ACCESS_TOKEN}`);
    const igBody = await igRes.json();
    console.log(`[Engine] Page "${page.name ?? page.id}" IG response:`, JSON.stringify(igBody).slice(0, 200));
    if (igRes.ok && igBody.instagram_business_account?.id) {
      console.log(`[Engine] Found IG Business Account ID: ${igBody.instagram_business_account.id} (via page: ${page.name ?? page.id})`);
      return igBody.instagram_business_account.id;
    }
  }

  throw new Error('No Instagram Business Account found linked to your Facebook Pages. Connect your Instagram Business account to a Facebook Page first.');
}

// ---------------------------------------------------------------------------
// Instagram — fetch all posts for a public business/creator account
// Uses the Business Discovery API via graph.facebook.com
// ---------------------------------------------------------------------------
async function fetchPostsForUser(igAccountId, username) {
  const posts = [];
  let afterCursor = null;

  do {
    const mediaFields = afterCursor
      ? `media.after(${afterCursor}){id,caption,media_url,permalink,timestamp,username}`
      : `media{id,caption,media_url,permalink,timestamp,username}`;

    const fields = `business_discovery.as(${username}){${mediaFields}}`;
    const url    = `${FACEBOOK_API_BASE}/${igAccountId}?fields=${fields}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;

    const res  = await fetch(url);
    const body = await res.json();

    if (!res.ok) {
      throw new Error(`Business Discovery error for @${username}: ${JSON.stringify(body.error ?? body)}`);
    }

    console.log(`[Engine] DEBUG @${username} raw:`, JSON.stringify(body).slice(0, 300));

    const media = body.business_discovery?.media;
    if (!media) break;

    posts.push(...(media.data ?? []));

    afterCursor = media.paging?.next ? (media.paging.cursors?.after ?? null) : null;
  } while (afterCursor);

  return posts;
}

// ---------------------------------------------------------------------------
// Notion — read active usernames from the "Instagram Accounts" database
// ---------------------------------------------------------------------------
async function getActiveUsernames(notion, collectionId) {
  const usernames = [];
  let cursor;

  do {
    const res = await notion.dataSources.query({
      data_source_id: collectionId,
      page_size: 100,
      start_cursor: cursor,
    });

    for (const page of res.results) {
      const active = page.properties?.['Active']?.checkbox;
      if (!active) continue;
      const raw = page.properties?.['Username']?.title?.[0]?.plain_text;
      if (raw) usernames.push(raw.replace(/^@/, '').trim());
    }

    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return usernames;
}

// ---------------------------------------------------------------------------
// Notion — collect every Post URL already in the "Instagram Posts" database
// ---------------------------------------------------------------------------
async function getExistingUrls(notion, collectionId) {
  const seen = new Set();
  let cursor;

  do {
    const res = await notion.dataSources.query({
      data_source_id: collectionId,
      page_size: 100,
      start_cursor: cursor,
    });

    for (const page of res.results) {
      const url = page.properties?.['Post URL']?.url;
      if (url) seen.add(url);
    }

    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return seen;
}

// ---------------------------------------------------------------------------
// Notion — write one post as a new database page
// ---------------------------------------------------------------------------
async function addToNotion(notion, post, collectionId) {
  const caption = post.caption ?? '';
  const title   = caption.length > 100
    ? caption.slice(0, 97) + '...'
    : caption || `Post by @${post.username}`;

  await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: collectionId },
    cover:  post.media_url ? { type: 'external', external: { url: post.media_url } } : undefined,
    properties: {
      Name:       { title:     [{ text: { content: title } }] },
      'Post URL': { url:       post.permalink },
      Caption:    { rich_text: [{ text: { content: caption.slice(0, 2000) } }] },
      Author:     { rich_text: [{ text: { content: `@${post.username}` } }] },
      Thumbnail:  { url:       post.media_url ?? null },
      'Posted At':{ date:      { start: post.timestamp } },
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  console.log('[Engine] 🚀 Instagram → Notion sync starting...');

  const notion = new Client({ auth: NOTION_API_KEY });

  const postsCollectionId    = NOTION_DATABASE_ID;
  const accountsCollectionId = NOTION_ACCOUNTS_DATABASE_ID;

  // 1. Read which accounts to track from Notion
  console.log('[Engine] 📋 Loading active accounts from Notion...');
  const usernames = await getActiveUsernames(notion, accountsCollectionId);

  if (usernames.length === 0) {
    console.log('[Engine] ⚠️  No active accounts found in "Instagram Accounts" database — nothing to do.');
    console.log('[Engine] Tip: Open your Notion "Instagram Accounts" database, add a username, and tick the Active checkbox.');
    return;
  }

  console.log(`[Engine] Tracking ${usernames.length} account(s): ${usernames.map(u => '@' + u).join(', ')}`);

  // 2. Discover the authenticated user's IG Business Account ID
  console.log('[Engine] 🔑 Discovering Instagram Business Account ID...');
  const igAccountId = await getIgBusinessAccountId();

  // 3. Load already-synced post URLs to avoid duplicates
  console.log('[Engine] 📋 Loading existing posts from Notion...');
  const existing = await getExistingUrls(notion, postsCollectionId);
  console.log(`[Engine] Found ${existing.size} existing post(s) in Notion`);

  // 3. Fetch and sync posts for each account
  let totalAdded = 0;

  for (const username of usernames) {
    console.log(`\n[Engine] 📸 Fetching posts for @${username}...`);

    let posts;
    try {
      posts = await fetchPostsForUser(igAccountId, username);
    } catch (err) {
      console.error(`[Engine] ❌ Could not fetch @${username}: ${err.message}`);
      continue;
    }

    const newPosts = posts.filter(p => !existing.has(p.permalink));
    console.log(`[Engine] Found ${posts.length} post(s), ${newPosts.length} new`);

    for (const post of newPosts) {
      try {
        await addToNotion(notion, post, postsCollectionId);
        existing.add(post.permalink);
        console.log(`[Engine] ✅ Added: ${post.permalink}`);
        totalAdded++;
      } catch (err) {
        console.error(`[Engine] ❌ Failed to add ${post.permalink}: ${err.message}`);
      }
    }
  }

  console.log(`\n[Engine] 🏁 Sync complete — ${totalAdded} new post(s) added across ${usernames.length} account(s)`);
}

run().catch(err => {
  console.error('[Engine] 💥 Fatal error:', err.message);
  process.exit(1);
});
