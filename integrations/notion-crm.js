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

  const page = await n.pages.create({
    parent: { database_id: db },
    properties: {
      Name:        { title:     [{ text: { content: lead.name || 'Unknown' } }] },
      Phone:       { phone_number: lead.phone || null },
      Email:       { email: lead.email || null },
      Status:      { select: { name: lead.status || 'New' } },
      Score:       { number: lead.score || 0 },
      Source:      { select: { name: lead.source || 'Unknown' } },
      Age:         { number: lead.age || null },
      Notes:       { rich_text: [{ text: { content: lead.notes || '' } }] },
      'Created At':{ date: { start: new Date().toISOString() } },
    },
  });
  return page.id;
}

export async function getLeadsByStatus(status) {
  const db = process.env.NOTION_LEADS_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const res = await n.dataSources.query({
    data_source_id: db,
    filter: { property: 'Status', select: { equals: status } },
    sorts: [{ property: 'Created At', direction: 'descending' }],
  });
  return res.results.map(pageToLead);
}

export async function getAllLeads(limit = 50) {
  const db = process.env.NOTION_LEADS_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const res = await n.dataSources.query({
    data_source_id: db,
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
    phone:  p.Phone?.phone_number || '',
    email:  p.Email?.email || '',
    status: p.Status?.select?.name || 'New',
    score:  p.Score?.number || 0,
    source: p.Source?.select?.name || 'Unknown',
    age:    p.Age?.number || null,
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
    },
  });
}

export async function getUpcomingContent(limit = 10) {
  const db = process.env.NOTION_CONTENT_DATABASE_ID;
  if (!db) return [];
  const n = getClient();

  const res = await n.dataSources.query({
    data_source_id: db,
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

  const res = await n.dataSources.query({
    data_source_id: db,
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
  const res = await n.dataSources.query({
    data_source_id: db,
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
