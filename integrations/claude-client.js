'use strict';

/**
 * AI Provider Client — Multi-model fallback with task-specific priority orders.
 *
 * Design principle: Claude Sonnet 4.6 is the most capable and most expensive
 * model. It is reserved as the LAST RESORT for all routine agents and as the
 * PRIMARY model only for high-level strategy/planning tasks (askStrategic).
 * All other agents exhaust cheaper/faster providers first.
 *
 *  CREATIVE   GPT-4o-mini → Gemini → DeepSeek → Grok → Claude (last resort)
 *    Best balance of quality and cost for marketing copy, sales outreach,
 *    follow-up messages, reply handling.
 *
 *  STRUCTURED  DeepSeek → GPT-4o-mini → Gemini → Grok → Claude (last resort)
 *    Cheap, precise reasoning for lead scoring, data extraction, JSON tasks.
 *
 *  FAST  Gemini → GPT-4o-mini → DeepSeek → Grok → Claude (last resort)
 *    Speed-first for appointment confirmations, reminders, short templates.
 *
 *  STRATEGIC  Claude → GPT-4o-mini → Gemini → DeepSeek → Grok
 *    Claude leads ONLY for high-level orchestration and planning tasks.
 *    Not used by routine agents.
 */

import Anthropic from '@anthropic-ai/sdk';

// ── Provider registry ──────────────────────────────────────────────────────

const PROVIDERS = {
  Claude: {
    name:   'Claude Sonnet 4.6',
    envKey: 'ANTHROPIC_API_KEY',
    type:   'anthropic',
  },
  OpenAI: {
    name:   'GPT-4o-mini',
    envKey: 'OPENAI_API_KEY',
    url:    'https://api.openai.com/v1/chat/completions',
    model:  'gpt-4o-mini',
    type:   'openai',
  },
  DeepSeek: {
    name:   'DeepSeek Chat',
    envKey: 'DEEPSEEK_API_KEY',
    url:    'https://api.deepseek.com/chat/completions',
    model:  'deepseek-chat',
    type:   'openai',
  },
  Gemini: {
    name:   'Gemini 2.0 Flash',
    envKey: 'GEMINI_API_KEY',
    url:    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model:  'gemini-2.0-flash',
    type:   'openai',
  },
  Grok: {
    name:   'Grok 3-mini',
    envKey: 'XAI_API_KEY',
    url:    'https://api.x.ai/v1/chat/completions',
    model:  'grok-3-mini',
    type:   'openai',
  },
};

// ── Task-specific priority orders ──────────────────────────────────────────
// Claude is ALWAYS last in routine orders — last resort only.

// Creative writing: marketing, sales outreach, follow-ups
const ORDER_CREATIVE   = ['OpenAI', 'Gemini', 'DeepSeek', 'Grok', 'Claude'];

// Structured data: lead scoring, enrichment, qualification JSON
const ORDER_STRUCTURED = ['DeepSeek', 'OpenAI', 'Gemini', 'Grok', 'Claude'];

// Fast/simple: appointment confirmations, reminders, short templates
const ORDER_FAST       = ['Gemini', 'OpenAI', 'DeepSeek', 'Grok', 'Claude'];

// Strategic planning: Claude leads — reserved for orchestration/planning only
const ORDER_STRATEGIC  = ['Claude', 'OpenAI', 'Gemini', 'DeepSeek', 'Grok'];

// Premium creative: Claude leads — used for marketing content, scripts, campaigns.
// This IS the product; don't cheap out on the model that writes it.
const ORDER_PREMIUM    = ['Claude', 'OpenAI', 'Gemini', 'DeepSeek', 'Grok'];

// ── Low-level callers ──────────────────────────────────────────────────────

async function callAnthropic(systemPrompt, userMessage, maxTokens) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp   = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  });
  return resp.content[0].text;
}

async function callOpenAICompatible(provider, systemPrompt, userMessage, maxTokens) {
  const res  = await fetch(provider.url, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${process.env[provider.envKey]}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model:      provider.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`${provider.name}: ${data.error.message}`);
  return data.choices[0].message.content;
}

// ── Core dispatcher ────────────────────────────────────────────────────────

async function askWithOrder(order, systemPrompt, userMessage, maxTokens) {
  const sequence = order
    .map(key => PROVIDERS[key])
    .filter(p => p && process.env[p.envKey]);

  if (!sequence.length) {
    throw new Error('No AI providers configured. Set at least one API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, GEMINI_API_KEY, or XAI_API_KEY) in Render.');
  }

  for (const provider of sequence) {
    try {
      const text = provider.type === 'anthropic'
        ? await callAnthropic(systemPrompt, userMessage, maxTokens)
        : await callOpenAICompatible(provider, systemPrompt, userMessage, maxTokens);
      console.log(`[AI] ✅ ${provider.name}`);
      return text;
    } catch (err) {
      console.warn(`[AI] ⚠️  ${provider.name} failed (${err.message}) — trying next`);
    }
  }

  throw new Error('All AI providers failed. Check API keys and credits in Render.');
}

async function askJSONWithOrder(order, systemPrompt, userMessage, maxTokens) {
  const raw = await askWithOrder(
    order,
    systemPrompt + '\n\nYou MUST respond with valid JSON only. No markdown, no explanation, no code fences.',
    userMessage,
    maxTokens,
  );
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`AI returned non-JSON: ${raw.slice(0, 300)}`);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * askClaude — GPT/Gemini-first, Claude is last resort.
 * Best for: marketing content, sales outreach, follow-up messages, reply handling.
 */
export async function askClaude(system, user, maxTokens = 1500) {
  return askWithOrder(ORDER_CREATIVE, system, user, maxTokens);
}

/**
 * askStrategic — Claude-first. RESERVED for high-level orchestration/planning.
 * Do NOT use in routine agents. Claude leads only when strategic reasoning matters.
 */
export async function askStrategic(system, user, maxTokens = 2000) {
  return askWithOrder(ORDER_STRATEGIC, system, user, maxTokens);
}

/**
 * askStructured — DeepSeek/GPT-first. Structured data tasks.
 * Best for: lead scoring, qualification JSON, data extraction.
 */
export async function askStructured(system, user, maxTokens = 1500) {
  return askWithOrder(ORDER_STRUCTURED, system, user, maxTokens);
}

/**
 * askFast — Gemini-first. Speed-optimised for short template tasks.
 * Best for: appointment confirmations, reminders, brief acknowledgements.
 */
export async function askFast(system, user, maxTokens = 800) {
  return askWithOrder(ORDER_FAST, system, user, maxTokens);
}

/**
 * askClaudeJSON — GPT/Gemini-first, Claude is last resort, returns parsed JSON.
 * Best for: structured data tasks where Claude quality is not critical.
 */
export async function askClaudeJSON(system, user, maxTokens = 1500) {
  return askJSONWithOrder(ORDER_CREATIVE, system, user, maxTokens);
}

/**
 * askPremiumJSON — Claude-first, returns parsed JSON.
 * Use for ALL marketing content: scripts, carousels, emails, hooks, calendars.
 * The content this generates IS the deliverable — use the best model.
 */
export async function askPremiumJSON(system, user, maxTokens = 1500) {
  return askJSONWithOrder(ORDER_PREMIUM, system, user, maxTokens);
}

/**
 * askPremium — Claude-first, returns plain text.
 * Use for marketing copy, custom content requests.
 */
export async function askPremium(system, user, maxTokens = 2000) {
  return askWithOrder(ORDER_PREMIUM, system, user, maxTokens);
}

/**
 * askStructuredJSON — DeepSeek/GPT-first, returns parsed JSON.
 * Best for: lead enrichment, scoring, qualification.
 */
export async function askStructuredJSON(system, user, maxTokens = 1500) {
  return askJSONWithOrder(ORDER_STRUCTURED, system, user, maxTokens);
}

/**
 * askClaudeStream — Claude-first, simulated stream (single chunk).
 * Used by the custom content endpoint.
 */
export async function askClaudeStream(system, user, onChunk) {
  const text = await askWithOrder(ORDER_CREATIVE, system, user, 2000);
  onChunk(text);
  return text;
}
