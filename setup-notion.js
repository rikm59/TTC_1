'use strict';

/**
 * One-time setup script — creates all Notion databases for the AI Agent Team.
 * Run: node setup-notion.js
 * Then copy the printed database IDs into your .env file.
 */

import 'dotenv/config';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!process.env.NOTION_API_KEY) {
  console.error('❌ NOTION_API_KEY not set in .env');
  process.exit(1);
}
if (!PARENT_PAGE_ID) {
  console.error('❌ NOTION_PARENT_PAGE_ID not set in .env\nCreate a blank Notion page, share it with your integration, and put its ID here.');
  process.exit(1);
}

async function createDatabase(title, properties) {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    title:  [{ type: 'text', text: { content: title } }],
    properties,
  });
  return db.id;
}

async function setup() {
  console.log('🚀 Setting up Xpert Life Solutions Notion databases...\n');

  // ── Leads Database ──
  const leadsId = await createDatabase('🎯 Leads — Xpert Life', {
    Name:         { title: {} },
    Phone:        { phone_number: {} },
    Email:        { email: {} },
    Status:       { select: { options: [
      { name: 'New',             color: 'blue' },
      { name: 'Contacted',       color: 'yellow' },
      { name: 'Qualified',       color: 'green' },
      { name: 'Nurture',         color: 'orange' },
      { name: 'Appointment Set', color: 'purple' },
      { name: 'Converted',       color: 'default' },
      { name: 'Not Qualified',   color: 'red' },
    ]}},
    Score:        { number: { format: 'number' } },
    Source:       { select: { options: [
      { name: 'Facebook Lead Ad', color: 'blue' },
      { name: 'Instagram',        color: 'pink' },
      { name: 'Landing Page',     color: 'green' },
      { name: 'Referral',         color: 'yellow' },
      { name: 'Manual',           color: 'gray' },
    ]}},
    Age:          { number: {} },
    Notes:        { rich_text: {} },
    'Created At': { date: {} },
    'Last Contact': { date: {} },
  });
  console.log(`✅ Leads database created: ${leadsId}`);

  // ── Content Calendar ──
  const contentId = await createDatabase('📅 Content Calendar — Xpert Life', {
    Title:           { title: {} },
    Platform:        { select: { options: [
      { name: 'Instagram', color: 'pink' },
      { name: 'Facebook',  color: 'blue' },
      { name: 'TikTok',    color: 'red' },
      { name: 'LinkedIn',  color: 'blue' },
      { name: 'Email',     color: 'green' },
    ]}},
    Type:            { select: { options: [
      { name: 'Reel',             color: 'red' },
      { name: 'Carousel',         color: 'purple' },
      { name: 'Static Post',      color: 'yellow' },
      { name: 'Story',            color: 'pink' },
      { name: 'Email Newsletter', color: 'green' },
    ]}},
    Status:          { select: { options: [
      { name: 'Draft',     color: 'gray' },
      { name: 'Scheduled', color: 'yellow' },
      { name: 'Published', color: 'green' },
    ]}},
    Script:          { rich_text: {} },
    Hook:            { rich_text: {} },
    Hashtags:        { rich_text: {} },
    'Scheduled Date':{ date: {} },
  });
  console.log(`✅ Content Calendar database created: ${contentId}`);

  // ── Appointments ──
  const appointmentsId = await createDatabase('📆 Appointments — Xpert Life', {
    Name:        { title: {} },
    Phone:       { phone_number: {} },
    Email:       { email: {} },
    Status:      { select: { options: [
      { name: 'Confirmed',  color: 'green' },
      { name: 'Completed',  color: 'blue' },
      { name: 'No-Show',    color: 'red' },
      { name: 'Cancelled',  color: 'gray' },
    ]}},
    Notes:       { rich_text: {} },
    'Date/Time': { date: {} },
  });
  console.log(`✅ Appointments database created: ${appointmentsId}`);

  // ── Follow-up Queue ──
  const followupId = await createDatabase('📬 Follow-Up Queue — Xpert Life', {
    'Lead Name':    { title: {} },
    'Lead ID':      { rich_text: {} },
    Channel:        { select: { options: [
      { name: 'SMS',   color: 'green' },
      { name: 'Email', color: 'blue' },
    ]}},
    'Follow-up #':  { number: {} },
    Message:        { rich_text: {} },
    Status:         { select: { options: [
      { name: 'Pending',  color: 'yellow' },
      { name: 'Sent',     color: 'green' },
      { name: 'Replied',  color: 'blue' },
      { name: 'Opted Out',color: 'red' },
    ]}},
    'Send At':      { date: {} },
    'Sent At':      { date: {} },
  });
  console.log(`✅ Follow-Up Queue database created: ${followupId}`);

  console.log('\n══════════════════════════════════════════════════');
  console.log('📋 ADD THESE TO YOUR .env FILE:');
  console.log('══════════════════════════════════════════════════');
  console.log(`NOTION_LEADS_DATABASE_ID=${leadsId}`);
  console.log(`NOTION_CONTENT_DATABASE_ID=${contentId}`);
  console.log(`NOTION_APPOINTMENTS_DATABASE_ID=${appointmentsId}`);
  console.log(`NOTION_FOLLOWUP_DATABASE_ID=${followupId}`);
  console.log('══════════════════════════════════════════════════\n');
  console.log('✅ Setup complete! Add the IDs above to your .env, then run: npm start');
}

setup().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
