'use strict';

import { Client } from '@notionhq/client';

let notion = null;

function getClient() {
  if (!notion) notion = new Client({ auth: process.env.NOTION_API_KEY });
  return notion;
}

// ─── Leads ──────────────────────────────────────────────────────────────────

export async function createLead(lead) {
  const db = process.env.NOTION_LEADS_DATABASE_ID;
  if (!db) throw new Error('NOTION_LEADS_DATABASE_ID not set');
  const n = getClient();

  const fullName = lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown';

  const properties = {
    Name:        { title:     [{ text: { content: fullName } }] },
    Phone:       { phone_number: lead.phone || null },
    Email:       { email: lead.email || null },
    Status:      { select: { name: lead.status || 'New' } },
    Score:       { number: lead.score || 0 },
    Source:      { select: { name: lead.source || 'Unknown' } },
    Age:         { number: lead.age || null },
    Notes:       { rich_text: [{ text: { content: lead.notes || '' } }] },
    'Created At':{ date: { start: new Date().toISOString() } },
  };

  if (lead.firstName) properties['First Name'] = { rich_text: [{ text: { content: lead.firstName } }] };
  if (lead.lastName)  properties['Last Name']  = { rich_text: [{ text: { content: lead.lastName  } }] };
  if (lead.product)   properties['Product']    = { select: { name: lead.product } };
  if (lead.smoker)    properties['Smoker']     = { select: { name: lead.smoker  } };
  if (lead.state)     properties['State']      = { rich_text: [{ text: { content: lead.state } }] };
  if (lead.preferredContactTime) properties['Preferred Contact Time'] = { select: { name: lead.preferredContactTime } };
  if (lead.consent !== undefined) properties['Consent'] = { checkbox: !!lead.consent };

  const page = await n.pages.create({ parent: { database_id: db }, properties });
  return page.id;
}

export async function getLeadsByStatus(status) {
  const db = process.env.NOTION_LEADS_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const res = await n.databases.query({
    database_id: db,
    filter: { property: 'Status', select: { equals: status } },
    sorts: [{ property: 'Created At', direction: 'descending' }],
  });
  return res.results.map(pageToLead);
}

export async function getAllLeads(limit = 50) {
  const db = process.env.NOTION_LEADS_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const res = await n.databases.query({
    database_id: db,
    page_size: limit,
    sorts: [{ property: 'Created At', direction: 'descending' }],
  });
  return res.results.map(pageToLead);
}

export async function updateLeadStatus(pageId, status, notes = '') {
  const n = getClient();
  const props = { Status: { select: { name: status } } };
  if (notes) props['Notes'] = { rich_text: [{ text: { content: notes } }] };
  props['Last Contact'] = { date: { start: new Date().toISOString() } };
  await n.pages.update({ page_id: pageId, properties: props });
}

export async function updateLeadScore(pageId, score) {
  const n = getClient();
  await n.pages.update({ page_id: pageId, properties: { Score: { number: score } } });
}

function pageToLead(page) {
  const p = page.properties;
  return {
    id: page.id,
    name:   p.Name?.title?.[0]?.plain_text || 'Unknown',
    firstName: p['First Name']?.rich_text?.[0]?.plain_text || '',
    lastName:  p['Last Name']?.rich_text?.[0]?.plain_text  || '',
    phone:  p.Phone?.phone_number || '',
    email:  p.Email?.email || '',
    status: p.Status?.select?.name || 'New',
    score:  p.Score?.number || 0,
    source: p.Source?.select?.name || 'Unknown',
    age:    p.Age?.number || null,
    product: p.Product?.select?.name || '',
    smoker:  p.Smoker?.select?.name  || '',
    state:   p.State?.rich_text?.[0]?.plain_text || '',
    preferredContactTime: p['Preferred Contact Time']?.select?.name || '',
    consent: p['Consent']?.checkbox ?? null,
    notes:  p.Notes?.rich_text?.[0]?.plain_text || '',
    createdAt: p['Created At']?.date?.start || '',
    lastContact: p['Last Contact']?.date?.start || '',
  };
}

// ─── Content Calendar ────────────────────────────────────────────────────────

export async function createContentItem(item) {
  const db = process.env.NOTION_CONTENT_DATABASE_ID;
  if (!db) throw new Error('NOTION_CONTENT_DATABASE_ID not set');
  const n = getClient();

  const children = buildContentBlocks(item);

  await n.pages.create({
    parent: { database_id: db },
    properties: {
      Title:     { title:     [{ text: { content: item.title } }] },
      Platform:  { select:   { name: item.platform || 'Instagram' } },
      Type:      { select:   { name: item.type || 'Carousel' } },
      Status:    { select:   { name: item.status || 'Draft' } },
      Script:    { rich_text: [{ text: { content: (item.script || '').slice(0, 2000) } }] },
      Hook:      { rich_text: [{ text: { content: item.hook || '' } }] },
      Hashtags:  { rich_text: [{ text: { content: item.hashtags || '' } }] },
      'Scheduled Date': { date: { start: item.scheduledDate || new Date().toISOString() } },
      ...(item.videoUrl ? { 'Video URL': { url: item.videoUrl } } : {}),
    },
    children: children.slice(0, 100),
  });
}

// ─── Notion page body builders ────────────────────────────────────────────────

function txt(content) {
  return [{ type: 'text', text: { content: String(content).slice(0, 2000) } }];
}

function heading1(content)  { return { type: 'heading_1',  heading_1:  { rich_text: txt(content) } }; }
function heading2(content)  { return { type: 'heading_2',  heading_2:  { rich_text: txt(content) } }; }
function heading3(content)  { return { type: 'heading_3',  heading_3:  { rich_text: txt(content) } }; }
function paragraph(content) { return { type: 'paragraph',  paragraph:  { rich_text: txt(content) } }; }
function quote(content)     { return { type: 'quote',       quote:      { rich_text: txt(content) } }; }
function divider()          { return { type: 'divider',     divider:    {} }; }
function callout(content, emoji) {
  return { type: 'callout', callout: { rich_text: txt(content), icon: { emoji } } };
}
function image(url) {
  return { type: 'image', image: { type: 'external', external: { url } } };
}

function buildContentBlocks(item) {
  if (item.type === 'Carousel')         return buildCarouselBlocks(item);
  if (item.type === 'Reel')             return buildReelBlocks(item);
  if (item.type === 'Story')            return buildReelBlocks(item);
  if (item.type === 'Email Newsletter') return buildEmailBlocks(item);
  return buildStaticPostBlocks(item);
}

function buildCarouselBlocks(item) {
  const blocks = [];

  // Cover
  blocks.push(heading1(`📲 ${item.hook || item.title}`));
  if (item.coverSubtitle) blocks.push(paragraph(item.coverSubtitle));
  if (item.imageUrl) blocks.push(image(item.imageUrl));
  blocks.push(divider());

  // Slides
  if (Array.isArray(item.slides)) {
    for (const s of item.slides) {
      blocks.push(heading2(`Slide ${s.slideNumber || ''}: ${s.title}`));
      if (s.body)        blocks.push(paragraph(s.body));
      if (s.visualNote)  blocks.push(callout(s.visualNote, '📸'));
      if (s.designStyle) blocks.push(callout(s.designStyle, '🎨'));
      blocks.push(divider());
    }
  }

  // CTA slide note
  if (item.ctaSlideText) {
    blocks.push(heading3('📣 CTA Slide Text'));
    blocks.push(quote(item.ctaSlideText));
    blocks.push(divider());
  }

  // Post caption
  if (item.caption) {
    blocks.push(heading3('💬 Post Caption'));
    blocks.push(quote(item.caption));
    blocks.push(divider());
  }

  // Hashtags
  if (item.hashtags) {
    blocks.push(heading3('#️⃣ Hashtags'));
    blocks.push(paragraph(item.hashtags));
  }

  return blocks;
}

function buildReelBlocks(item) {
  const blocks = [];

  if (item.hook) blocks.push(callout(item.hook, '🪝'));

  if (item.script) {
    blocks.push(heading2('📝 Script'));
    for (const para of item.script.split('\n\n').filter(Boolean)) {
      blocks.push(paragraph(para));
    }
    blocks.push(divider());
  }

  if (item.videoUrl) {
    blocks.push(callout(`Video: ${item.videoUrl}`, '🎬'));
  } else {
    blocks.push(callout('Video generating — check back soon', '⏳'));
  }

  if (item.hashtags) {
    blocks.push(heading3('#️⃣ Hashtags'));
    blocks.push(paragraph(item.hashtags));
  }

  return blocks;
}

function buildStaticPostBlocks(item) {
  const blocks = [];

  if (item.hook) blocks.push(callout(item.hook, '🪝'));
  if (item.imageUrl) blocks.push(image(item.imageUrl));

  if (item.script) {
    blocks.push(heading2('💬 Caption'));
    blocks.push(quote(item.script));
    blocks.push(divider());
  }

  if (item.designNotes) {
    blocks.push(heading3('🎨 Design Notes'));
    blocks.push(callout(item.designNotes, '🎨'));
    blocks.push(divider());
  }

  if (item.hashtags) {
    blocks.push(heading3('#️⃣ Hashtags'));
    blocks.push(paragraph(item.hashtags));
  }

  return blocks;
}

function buildEmailBlocks(item) {
  const blocks = [];

  if (item.hook) blocks.push(heading1(`📧 Subject: ${item.hook}`));

  if (item.script) {
    blocks.push(divider());
    for (const para of item.script.split('\n\n').filter(Boolean)) {
      blocks.push(paragraph(para));
    }
  }

  return blocks;
}

export async function appendContentPageBlocks(pageId, item) {
  const n = getClient();
  const children = buildContentBlocks(item).slice(0, 100);
  if (!children.length) return;
  await n.blocks.children.append({ block_id: pageId, children });
}

export async function getContentItemsWithBlankPages(limit = 50) {
  const db = process.env.NOTION_CONTENT_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const res = await n.databases.query({
    database_id: db,
    sorts: [{ property: 'Scheduled Date', direction: 'descending' }],
    page_size: limit,
  });

  const items = [];
  for (const page of res.results) {
    const blocks = await n.blocks.children.list({ block_id: page.id, page_size: 1 });
    if (blocks.results.length === 0) {
      const p = page.properties;
      items.push({
        id:       page.id,
        title:    p.Title?.title?.[0]?.plain_text || '',
        type:     p.Type?.select?.name || '',
        platform: p.Platform?.select?.name || '',
        hook:     p.Hook?.rich_text?.[0]?.plain_text || '',
        script:   p.Script?.rich_text?.[0]?.plain_text || '',
        hashtags: p.Hashtags?.rich_text?.[0]?.plain_text || '',
        videoUrl: p['Video URL']?.url || '',
      });
    }
  }
  return items;
}

export async function getReelsWithoutVideos(limit = 20) {
  const db = process.env.NOTION_CONTENT_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const res = await n.databases.query({
    database_id: db,
    filter: {
      and: [
        { property: 'Type', select: { equals: 'Reel' } },
        { property: 'Video URL', url: { is_empty: true } },
      ],
    },
    sorts: [{ property: 'Scheduled Date', direction: 'descending' }],
    page_size: limit,
  });

  return res.results.map(page => {
    const p = page.properties;
    return {
      id: page.id,
      title:    p.Title?.title?.[0]?.plain_text || '',
      platform: p.Platform?.select?.name || '',
      type:     p.Type?.select?.name || '',
      hook:     p.Hook?.rich_text?.[0]?.plain_text || '',
      script:   p.Script?.rich_text?.[0]?.plain_text || '',
      angle:    '',
    };
  });
}

export async function updateContentVideoUrl(pageId, videoUrl) {
  const n = getClient();
  await n.pages.update({
    page_id: pageId,
    properties: { 'Video URL': { url: videoUrl } },
  });
}

export async function getUpcomingContent(limit = 10) {
  const db = process.env.NOTION_CONTENT_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const res = await n.databases.query({
    database_id: db,
    filter: { property: 'Status', select: { does_not_equal: 'Published' } },
    sorts: [{ property: 'Scheduled Date', direction: 'ascending' }],
    page_size: limit,
  });
  return res.results.map(page => {
    const p = page.properties;
    return {
      id: page.id,
      title:     p.Title?.title?.[0]?.plain_text || '',
      platform:  p.Platform?.select?.name || '',
      type:      p.Type?.select?.name || '',
      status:    p.Status?.select?.name || '',
      script:    p.Script?.rich_text?.[0]?.plain_text || '',
      hook:      p.Hook?.rich_text?.[0]?.plain_text || '',
      hashtags:  p.Hashtags?.rich_text?.[0]?.plain_text || '',
      scheduledDate: p['Scheduled Date']?.date?.start || '',
    };
  });
}

// ─── Appointments ────────────────────────────────────────────────────────────

export async function createAppointment(appt) {
  const db = process.env.NOTION_APPOINTMENTS_DATABASE_ID;
  if (!db) throw new Error('NOTION_APPOINTMENTS_DATABASE_ID not set');
  const n = getClient();

  await n.pages.create({
    parent: { database_id: db },
    properties: {
      Name:     { title:     [{ text: { content: appt.name } }] },
      Phone:    { phone_number: appt.phone || null },
      Email:    { email: appt.email || null },
      Status:   { select:    { name: appt.status || 'Confirmed' } },
      Notes:    { rich_text: [{ text: { content: appt.notes || '' } }] },
      'Date/Time': { date: { start: appt.datetime || new Date().toISOString() } },
    },
  });
}

export async function getUpcomingAppointments() {
  const db = process.env.NOTION_APPOINTMENTS_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const res = await n.databases.query({
    database_id: db,
    filter: { property: 'Status', select: { equals: 'Confirmed' } },
    sorts: [{ property: 'Date/Time', direction: 'ascending' }],
    page_size: 20,
  });
  return res.results.map(page => {
    const p = page.properties;
    return {
      id: page.id,
      name:     p.Name?.title?.[0]?.plain_text || '',
      phone:    p.Phone?.phone_number || '',
      email:    p.Email?.email || '',
      status:   p.Status?.select?.name || '',
      notes:    p.Notes?.rich_text?.[0]?.plain_text || '',
      datetime: p['Date/Time']?.date?.start || '',
    };
  });
}

// ─── Follow-up Queue ─────────────────────────────────────────────────────────

export async function queueFollowUp(item) {
  const db = process.env.NOTION_FOLLOWUP_DATABASE_ID;
  if (!db) {
    console.warn('[Notion CRM] NOTION_FOLLOWUP_DATABASE_ID not set — follow-up queued in memory only');
    return;
  }
  const n = getClient();

  await n.pages.create({
    parent: { database_id: db },
    properties: {
      'Lead Name':    { title:     [{ text: { content: item.leadName } }] },
      'Lead ID':      { rich_text: [{ text: { content: item.leadId } }] },
      Channel:        { select:    { name: item.channel || 'SMS' } },
      'Follow-up #':  { number: item.followUpNumber || 1 },
      Message:        { rich_text: [{ text: { content: (item.message || '').slice(0, 2000) } }] },
      Status:         { select:    { name: 'Pending' } },
      'Send At':      { date: { start: item.sendAt || new Date().toISOString() } },
    },
  });
}

export async function getPendingFollowUps() {
  const db = process.env.NOTION_FOLLOWUP_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const now = new Date().toISOString();
  const res = await n.databases.query({
    database_id: db,
    filter: {
      and: [
        { property: 'Status', select: { equals: 'Pending' } },
        { property: 'Send At', date: { on_or_before: now } },
      ],
    },
    page_size: 50,
  });
  return res.results.map(page => {
    const p = page.properties;
    return {
      id: page.id,
      leadName:       p['Lead Name']?.title?.[0]?.plain_text || '',
      leadId:         p['Lead ID']?.rich_text?.[0]?.plain_text || '',
      channel:        p.Channel?.select?.name || 'SMS',
      followUpNumber: p['Follow-up #']?.number || 1,
      message:        p.Message?.rich_text?.[0]?.plain_text || '',
      sendAt:         p['Send At']?.date?.start || '',
    };
  });
}

export async function markFollowUpSent(pageId) {
  const n = getClient();
  await n.pages.update({
    page_id: pageId,
    properties: {
      Status:    { select: { name: 'Sent' } },
      'Sent At': { date: { start: new Date().toISOString() } },
    },
  });
}

// ─── Activity Log (in-memory with last 200 entries) ──────────────────────────

const activityLog = [];

export function logActivity(agent, action, details = '') {
  const entry = {
    timestamp: new Date().toISOString(),
    agent,
    action,
    details,
  };
  activityLog.unshift(entry);
  if (activityLog.length > 200) activityLog.pop();
  console.log(`[${agent}] ${action}${details ? ' — ' + details : ''}`);
}

export function getActivityLog(limit = 50) {
  return activityLog.slice(0, limit);
}
