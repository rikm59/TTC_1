'use strict';

/**
 * Lead Generator Agent
 * Runs every morning at 8 AM.
 * Sources: Facebook Lead Ads, Instagram engagement, landing page webhooks, manual queue.
 * Generates 10–20 qualified leads per run and stores them in the Notion CRM.
 */

import { askStructuredJSON } from '../integrations/claude-client.js';
import { createLead, logActivity } from '../integrations/notion-crm.js';

const FB_BASE = 'https://graph.facebook.com/v21.0';

// In-memory queue for webhook-sourced leads (filled by xpert-server.js webhook handler)
const pendingLeads = [];
export function queueWebhookLead(lead) { pendingLeads.push(lead); }

// ─── Main Run ─────────────────────────────────────────────────────────────────

export async function runLeadGenerator() {
  logActivity('Lead Generator', '🚀 Morning lead generation starting');
  const allLeads = [];

  // 1. Facebook Lead Ads
  try {
    const fbLeads = await fetchFacebookLeads();
    allLeads.push(...fbLeads);
    logActivity('Lead Generator', `📘 Facebook Lead Ads`, `${fbLeads.length} leads collected`);
  } catch (err) {
    logActivity('Lead Generator', '⚠️ Facebook Lead Ads skipped', err.message);
  }

  // 2. Instagram engagement leads
  try {
    const igLeads = await fetchInstagramLeads();
    allLeads.push(...igLeads);
    logActivity('Lead Generator', `📸 Instagram engagement`, `${igLeads.length} leads collected`);
  } catch (err) {
    logActivity('Lead Generator', '⚠️ Instagram leads skipped', err.message);
  }

  // 3. Webhook / landing page queue
  if (pendingLeads.length > 0) {
    const batch = pendingLeads.splice(0, pendingLeads.length);
    allLeads.push(...batch.map(l => ({ ...l, source: 'Landing Page' })));
    logActivity('Lead Generator', `🌐 Landing page queue`, `${batch.length} leads collected`);
  }

  if (allLeads.length === 0) {
    logActivity('Lead Generator', '⚠️ No raw leads found — check your Facebook Lead Ads and landing page funnels');
    return { count: 0, leads: [] };
  }

  // 4. Enrich and score each lead with Claude
  const enriched = [];
  for (const raw of allLeads) {
    try {
      const lead = await enrichLead(raw);
      const pageId = await createLead(lead);
      enriched.push({ ...lead, pageId });
      logActivity('Lead Generator', `✅ Lead saved`, `${lead.name} — Score: ${lead.score}/10`);
    } catch (err) {
      logActivity('Lead Generator', `❌ Failed to save lead`, err.message);
    }
  }

  logActivity('Lead Generator', `🏁 Run complete`, `${enriched.length} leads saved to CRM`);
  return { count: enriched.length, leads: enriched };
}

// ─── Facebook Lead Ads ────────────────────────────────────────────────────────

async function fetchFacebookLeads() {
  const token   = process.env.INSTAGRAM_ACCESS_TOKEN;
  const formIds = (process.env.FACEBOOK_LEAD_FORM_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

  if (!token || formIds.length === 0) {
    // No form IDs configured — skip silently
    return [];
  }

  const since = Math.floor((Date.now() - 86_400_000) / 1000); // last 24h
  const leads = [];

  for (const formId of formIds) {
    const url = `${FB_BASE}/${formId}/leads?fields=id,created_time,field_data&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${since}}]&access_token=${token}`;
    const res  = await fetch(url);
    const body = await res.json();

    if (!res.ok) throw new Error(`FB Lead Ads error: ${JSON.stringify(body.error)}`);

    for (const entry of (body.data || [])) {
      const fields = {};
      for (const f of (entry.field_data || [])) fields[f.name] = f.values?.[0] || '';
      const firstName = fields['first_name'] || '';
      const lastName  = fields['last_name']  || '';
      leads.push({
        source:              'Facebook Lead Ad',
        fbLeadId:            entry.id,
        name:                fields['full_name'] || [firstName, lastName].filter(Boolean).join(' ') || 'Unknown',
        firstName,
        lastName,
        email:               fields['email'] || '',
        phone:               fields['phone_number'] || fields['phone'] || '',
        age:                 parseInt(fields['age']) || null,
        product:             fields['life_insurance_product'] || fields['product'] || '',
        smoker:              fields['smoker'] || fields['tobacco_use'] || '',
        state:               fields['state'] || fields['residence_state'] || '',
        preferredContactTime: fields['preferred_contact_time'] || fields['best_time_to_call'] || '',
        notes:               `Form ID: ${formId}`,
      });
    }
  }
  return leads;
}

// ─── Instagram Engagement Leads ───────────────────────────────────────────────

async function fetchInstagramLeads() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  // Keywords that signal insurance interest
  const INTENT_KEYWORDS = ['interested', 'info', 'details', 'how much', 'quote', 'dm me', 'need this', 'sign me up', 'how do i'];

  let igAccountId;
  try {
    igAccountId = await getIgBusinessAccountId(token);
  } catch {
    return [];
  }

  // Get our own recent media posts
  const mediaRes  = await fetch(`${FB_BASE}/${igAccountId}/media?fields=id,caption,timestamp&limit=5&access_token=${token}`);
  const mediaBody = await mediaRes.json();
  if (!mediaRes.ok || !mediaBody.data) return [];

  const leads = [];

  for (const post of mediaBody.data) {
    const commRes  = await fetch(`${FB_BASE}/${post.id}/comments?fields=id,text,username,timestamp&access_token=${token}`);
    const commBody = await commRes.json();
    if (!commRes.ok) continue;

    for (const comment of (commBody.data || [])) {
      const text = (comment.text || '').toLowerCase();
      const hasIntent = INTENT_KEYWORDS.some(k => text.includes(k));
      if (!hasIntent) continue;

      leads.push({
        source:  'Instagram Comment',
        name:    comment.username || 'Instagram User',
        igHandle:`@${comment.username}`,
        phone:   '',
        email:   '',
        notes:   `Commented: "${comment.text}" on post ${post.id}`,
      });
    }
  }
  return leads;
}

async function getIgBusinessAccountId(token) {
  const res  = await fetch(`${FB_BASE}/me/accounts?access_token=${token}`);
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body.error));
  for (const page of (body.data || [])) {
    const igRes  = await fetch(`${FB_BASE}/${page.id}?fields=instagram_business_account&access_token=${token}`);
    const igBody = await igRes.json();
    if (igBody.instagram_business_account?.id) return igBody.instagram_business_account.id;
  }
  throw new Error('No IG Business Account found');
}

// ─── AI Enrichment ────────────────────────────────────────────────────────────

async function enrichLead(raw) {
  const SYSTEM = `You are a life insurance lead scoring expert for Xpert Life Solutions.
Given raw lead data, return a JSON object with:
- name: string
- phone: string (keep as-is or empty)
- email: string (keep as-is or empty)
- age: number or null
- source: string
- score: number 1-10 (life insurance purchase likelihood)
- notes: string (2-3 sentences about this lead's fit and recommended approach)
- priority: "Hot" | "Warm" | "Cold"

Scoring criteria:
- 8-10: Has phone/email, clear intent, right age range (25-55), family indicators
- 5-7: Partial contact info, moderate intent
- 1-4: Incomplete info, low intent

Always return valid JSON with these exact keys.`;

  try {
    const enriched = await askStructuredJSON(SYSTEM, JSON.stringify(raw));
    return {
      name:      enriched.name   || raw.name || 'Unknown',
      firstName: raw.firstName   || '',
      lastName:  raw.lastName    || '',
      phone:     enriched.phone  || raw.phone || '',
      email:     enriched.email  || raw.email || '',
      age:       enriched.age    || raw.age   || null,
      source:    enriched.source || raw.source || 'Unknown',
      score:     enriched.score  || 5,
      notes:     enriched.notes  || raw.notes || '',
      status:    'New',
      priority:  enriched.priority || 'Warm',
      // Preserve lead form fields verbatim — AI doesn't modify these
      product:              raw.product              || '',
      smoker:               raw.smoker               || '',
      state:                raw.state                || '',
      preferredContactTime: raw.preferredContactTime || '',
    };
  } catch {
    return {
      name: raw.name || 'Unknown', firstName: raw.firstName || '', lastName: raw.lastName || '',
      phone: raw.phone || '', email: raw.email || '', age: raw.age || null,
      source: raw.source || 'Unknown', score: 5, notes: raw.notes || '',
      status: 'New', priority: 'Warm',
      product: raw.product || '', smoker: raw.smoker || '',
      state: raw.state || '', preferredContactTime: raw.preferredContactTime || '',
    };
  }
}
