'use strict';
import 'dotenv/config';
import { schedules, logger } from '@trigger.dev/sdk';

import { runMarketingTeam } from '../agents/marketing-team.js';
import { sendOwnerEmail }   from '../integrations/email-client.js';

// Mon=1, Wed=3, Fri=5 at 9AM Chicago time
export const contentCreation = schedules.task({
  id: 'content-creation',
  cron: {
    pattern:  '0 9 * * 1,3,5',
    timezone: 'America/Chicago',
  },
  maxDuration: 300,

  run: async () => {
    logger.info('🎨 Content Creation run starting', { time: new Date().toISOString() });

    const result = await runMarketingTeam();

    logger.info('Content creation complete', result);

    await sendOwnerEmail(
      '🎨 Xpert Life AI — Content Calendar Updated',
      `<p>Your Marketing Team has finished today's content creation run.</p>
       <ul>
         <li>📹 Reel Script — ready</li>
         <li>🖼️ Carousel Post — ready</li>
         <li>📸 Static Post — ready</li>
         <li>📧 Email Newsletter — ready</li>
       </ul>
       <p>Review your <strong>Notion Content Calendar</strong> to schedule posts.</p>`
    ).catch(e => logger.warn('Owner email failed', { error: e.message }));

    return { success: true, ...result };
  },
});
