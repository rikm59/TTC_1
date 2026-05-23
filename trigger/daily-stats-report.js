'use strict';
import 'dotenv/config';
import { schedules, logger } from '@trigger.dev/sdk';

import { getAllLeads, getLeadsByStatus, getUpcomingAppointments } from '../integrations/notion-crm.js';
import { sendOwnerEmail } from '../integrations/email-client.js';

export const dailyStatsReport = schedules.task({
  id: 'daily-stats-report',
  cron: {
    pattern:  '0 18 * * *',
    timezone: 'America/Chicago',
  },
  maxDuration: 60,

  run: async () => {
    logger.info('📊 Daily Stats Report starting', { time: new Date().toISOString() });

    const [allLeads, qualifiedLeads, appointments, nurtureLeads] = await Promise.all([
      getAllLeads(200),
      getLeadsByStatus('Qualified'),
      getUpcomingAppointments(),
      getLeadsByStatus('Nurture'),
    ]);

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const stats = {
      total:        allLeads.length,
      qualified:    qualifiedLeads.length,
      appointments: appointments.length,
      nurture:      nurtureLeads.length,
    };

    logger.info('Stats compiled', stats);

    await sendOwnerEmail(
      `📊 Xpert Life — Daily Summary (${today})`,
      `<div style="font-family:Arial,sans-serif;max-width:600px">
        <div style="background:#0F1F3D;color:white;padding:24px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">📊 End-of-Day Report</h2>
          <p style="margin:8px 0 0;opacity:.8">${today}</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <table style="width:100%;border-collapse:collapse">
            <tr style="background:#0F1F3D;color:white">
              <th style="padding:10px 12px;text-align:left">Metric</th>
              <th style="padding:10px 12px;text-align:right">Count</th>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">🏆 Total in CRM</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>${stats.total}</strong></td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">✅ Qualified</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>${stats.qualified}</strong></td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">📆 Upcoming Appointments</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>${stats.appointments}</strong></td>
            </tr>
            <tr>
              <td style="padding:10px 12px">🔄 In Nurture</td>
              <td style="padding:10px 12px;text-align:right"><strong>${stats.nurture}</strong></td>
            </tr>
          </table>
          <p style="margin-top:20px;font-size:13px;color:#9ca3af">
            Xpert Life Solutions — AI Agent Team | Daily 6PM Report
          </p>
        </div>
      </div>`
    );

    return { success: true, stats };
  },
});
