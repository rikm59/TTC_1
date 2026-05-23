'use strict';
import 'dotenv/config';
import { schedules, logger } from '@trigger.dev/sdk';

import { runFollowUpAgent } from '../agents/followup-agent.js';

export const followupProcessor = schedules.task({
  id: 'followup-processor',
  cron: {
    pattern:  '0 */2 * * *',
    timezone: 'America/Chicago',
  },
  maxDuration: 120,

  run: async () => {
    logger.info('📬 Follow-Up Processor starting', { time: new Date().toISOString() });

    const result = await runFollowUpAgent();

    logger.info('Follow-up run complete', result);
    return { success: true, ...result };
  },
});
