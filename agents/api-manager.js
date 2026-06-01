'use strict';

import { askFast, askPremiumJSON, askStrategic } from '../integrations/claude-client.js';
import { logActivity } from '../integrations/notion-crm.js';
import { search, summary } from '../integrations/api-registry.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Exported functions ─────────────────────────────────────────────────────

export async function searchApis(query, { category, maxResults = 10 } = {}) {
  const results = search(query, { category });
  return results.slice(0, maxResults);
}

export async function recommendApis(taskDescription, { maxResults = 5, categories = [] } = {}) {
  const keywordRaw = await askFast(
    'Extract 3–5 short search keywords from the task description. Return only the keywords separated by spaces, nothing else.',
    taskDescription,
    100,
  );

  const keywords = keywordRaw.trim().split(/\s+/).filter(Boolean);

  const candidates = [];
  const seen = new Set();

  for (const kw of keywords) {
    const hits = search(kw, categories.length ? { category: categories[0] } : {});
    for (const hit of hits) {
      const key = hit.url;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push(hit);
      }
    }
  }

  const pool = candidates.slice(0, 40);

  const SYSTEM = `You are an API recommendation expert.
Given a task description and a list of API candidates, select and rank the best ${maxResults} APIs for the task.
Return a JSON object with a single key "recommendations" whose value is an array of objects with these keys:
rank (1-based integer), name, url, description, category, rationale (1 sentence why it fits), usageHint (1 sentence on how to use it for this task).
Include only APIs from the provided candidates list. Return valid JSON only.`;

  const USER = `Task: ${taskDescription}\n\nCandidates:\n${JSON.stringify(pool, null, 2)}`;

  const result = await askPremiumJSON(SYSTEM, USER, 2000);

  return { recommendations: result.recommendations || [], query: keywords.join(' ') };
}

export async function generateIntegrationStub(apiEntry) {
  const { name, url, description, category } = apiEntry;

  const SYSTEM = `You are an expert Node.js developer.
Generate a complete ESM JavaScript integration module for the given API.
Follow these conventions exactly:
- Start with a single-line JSDoc comment: /** <API name> client — <one-line description> */
- Use named async exports for every operation (no default export)
- Load secrets via process.env (dotenv-compatible)
- Use fetch for all HTTP calls
- Include a brief inline comment only where the why is non-obvious
- No class syntax, no CommonJS require
Return only the raw JS code, no markdown, no code fences.`;

  const USER = `API Name: ${name}
URL / Docs: ${url}
Description: ${description}
Category: ${category}`;

  const code = await askStrategic(SYSTEM, USER, 2000);
  const filename = `${slugify(name)}-client.js`;

  return { filename, code };
}

export async function runApiManager(command, payload = {}) {
  logActivity('API Manager', `Command: ${command}`, JSON.stringify(payload).slice(0, 120));

  switch (command) {
    case 'recommend': {
      const { taskDescription, ...opts } = payload;
      const result = await recommendApis(taskDescription, opts);
      logActivity('API Manager', 'recommend complete', `${result.recommendations.length} results`);
      return result;
    }
    case 'stub': {
      const result = await generateIntegrationStub(payload);
      logActivity('API Manager', 'stub generated', result.filename);
      return result;
    }
    case 'search': {
      const { query, ...opts } = payload;
      const result = await searchApis(query, opts);
      logActivity('API Manager', 'search complete', `${result.length} results`);
      return result;
    }
    case 'summary': {
      const result = summary();
      logActivity('API Manager', 'summary complete', `${result.length} categories`);
      return result;
    }
    default:
      throw new Error(`Unknown command: ${command}. Valid commands: recommend, stub, search, summary`);
  }
}
