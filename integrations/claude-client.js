'use strict';

/**
 * AI Provider Client — Multi-model fallback with task-specific priority orders.
 *
 * Research-backed model assignments (2025-2026):
 *
 *  CREATIVE  (Claude → OpenAI → Gemini → DeepSeek → Grok)
 *    Claude Sonnet 4.6 leads: best brand voice, empathy, instruction-following,
 *    fewest hallucinations. Use for: marketing copy, sales outreach, follow-ups,
 *    reply handling — anything requiring human emotional resonance.
 *
 *  STRUCTURED  (DeepSeek → OpenAI → Gemini → Claude → Grok)
 *    DeepSeek/GPT lead: strong at step-by-step reasoning, JSON extraction,
 *    scoring/classification, cheap for high volume. Use for: lead enrichment,
 *    lead qualification scoring, any task that returns structured JSON data.
 *
 *  FAST  (Gemini → OpenAI → DeepSeek → Claude → Grok)
 *    Gemini 2.0 Flash leads: 2× faster than alternatives, ideal for short
 *    template-based generation where speed > creativity. Use for: appointment
 *    confirmations, reminders, simple acknowledgement messages.
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

// Claude first: marketing copy, sales outreach, follow-up messages, reply handling
const ORDER_CREATIVE   = ['Claude', 'OpenAI', 'Gemini', 'DeepSeek', 'Grok'];

// DeepSeek/GPT first: lead scoring, data extraction, qualification JSON
const ORDER_STRUCTURED = ['DeepSeek', 'OpenAI', 'Gemini', 'Claude', 'Grok'];

// Gemini first: appointment confirmations, reminders, simple short templates
const ORDER_FAST       = ['Gemini', 'OpenAI', 'DeepSeek', 'Claude', 'Grok'];

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
 * askClaude — Claude-first. General purpose + creative tasks.
 * Best for: marketing content, sales outreach, follow-up messages, reply handling.
 */
export async function askClaude(system, user, maxTokens = 1500) {
  return askWithOrder(ORDER_CREATIVE, system, user, maxTokens);
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
 * askClaudeJSON — Claude-first, returns parsed JSON.
 * Best for: creative content with structured output (marketing calendar, scripts).
 */
export async function askClaudeJSON(system, user, maxTokens = 1500) {
  return askJSONWithOrder(ORDER_CREATIVE, system, user, maxTokens);
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
