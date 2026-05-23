import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
  project: 'proj_twzvnqlcuqidymnzbikd',
  runtime: 'node',
  dirs: ['./trigger'],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true,
    },
  },
});
