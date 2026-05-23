'use strict';
import 'dotenv/config';
import { schedules, logger } from '@trigger.dev/sdk';

import { runLeadGenerator }        from '../agents/lead-generator.js';
import { runSalesAgent }            from '../agents/sales-agent.js';
import { runFollowUpAgent }         from '../agents/followup-agent.js';
import { sendAppointmentReminders } from '../agents/scheduling-agent.js';
import { sendOwnerAlert }           from '../integrations/twilio-client.js';
import { sendOwnerEmail }           from '../integrations/email-client.js';

export const morningAgentRun = schedules.task({
  id: 'morning-agent-run',
  cron: {
    pattern:  '0 8 * * *',
    timezone: 'America/Chicago',
  },
  maxDuration: 300,

  run: async () => {
    logger.info('🌅 Morning Agent Run starting', { time: new Date().toISOString() });

    // 1. Pull & enrich new leads
    logger.info('Step 1: Lead Generator');
    const leads = await runLeadGenerator();

    // 2. Qualify leads, send outreach, alert owner on hot leads
    logger.info('Step 2: Sales Agent');
    await runSalesAgent();

    // 3. Process any due follow-ups
    logger.info('Step 3: Follow-Up Agent');
    await runFollowUpAgent();

    // 4. Send 24h appointment reminders
    logger.info('Step 4: Appointment Reminders');
    await sendAppointmentReminders();

    // 5. Owner summary
    const summary = `✅ Morning run complete. ${leads?.length ?? 0} new lead(s) processed. Check dashboard for activity.`;
    logger.info(summary);

    await Promise.allSettled([
      sendOwnerAlert(summary),
      sendOwnerEmail(
        '🌅 Xpert Life AI — Morning Run Complete',
        `<p>${summary}</p><p>Log in to your dashboard to review leads and activity.</p>`
      ),
    ]);

    return { success: true, leadsProcessed: leads?.length ?? 0 };
  },
});
