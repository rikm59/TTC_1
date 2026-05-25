'use strict';

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL = 'claude-sonnet-4-6';

// ── Fallback provider chain ────────────────────────────────────────────────
// Tried in order when Anthropic credits are exhausted.

const FALLBACK_PROVIDERS = [
  {
    name:    'OpenAI',
    envKey:  'OPENAI_API_KEY',
    url:     'https://api.openai.com/v1/chat/completions',
    model:   'gpt-4o-mini',
  },
  {
    name:    'DeepSeek',
    envKey:  'DEEPSEEK_API_KEY',
    url:     'https://api.deepseek.com/chat/completions',
    model:   'deepseek-chat',
  },
  {
    name:    'Gemini',
    envKey:  'GEMINI_API_KEY',
    url:     'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model:   'gemini-2.0-flash',
  },
];

function isCreditsError(err) {
  const msg = err.message || '';
  return msg.includes('credit balance') ||
         msg.includes('insufficient_quota') ||
         msg.includes('billing') ||
         err.status === 429;
}

async function askFallback(systemPrompt, userMessage, maxTokens) {
  for (const provider of FALLBACK_PROVIDERS) {
    const apiKey = process.env[provider.envKey];
    if (!apiKey) continue;

    console.warn(`[AI] ⚠️  Trying fallback: ${provider.name}`);
    try {
      const res = await fetch(provider.url, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          model:      provider.model,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMessage  },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(`${provider.name} error: ${data.error.message}`);
      console.warn(`[AI] ✅ ${provider.name} responded successfully`);
      return data.choices[0].message.content;
    } catch (err) {
      console.warn(`[AI] ❌ ${provider.name} failed: ${err.message} — trying next`);
    }
  }
  throw new Error('All AI providers failed or are unconfigured. Add OPENAI_API_KEY, DEEPSEEK_API_KEY, or GEMINI_API_KEY to Render.');
}

// ── Exported functions (same signatures as before) ─────────────────────────

export async function askClaude(systemPrompt, userMessage, maxTokens = 1500) {
  try {
    const response = await client.messages.create({
      model:      CLAUDE_MODEL,
      max_tokens: maxTokens,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    });
    return response.content[0].text;
  } catch (err) {
    if (isCreditsError(err)) return askFallback(systemPrompt, userMessage, maxTokens);
    throw err;
  }
}

export async function askClaudeJSON(systemPrompt, userMessage, maxTokens = 1500) {
  const raw = await askClaude(
    systemPrompt + '\n\nYou MUST respond with valid JSON only. No markdown, no explanation, no code fences.',
    userMessage,
    maxTokens
  );
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`AI returned non-JSON: ${raw.slice(0, 200)}`);
  }
}

export async function askClaudeStream(systemPrompt, userMessage, onChunk) {
  try {
    const stream = client.messages.stream({
      model:      CLAUDE_MODEL,
      max_tokens: 2000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    });
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        onChunk(chunk.delta.text);
      }
    }
    const final = await stream.finalMessage();
    return final.content[0].text;
  } catch (err) {
    if (isCreditsError(err)) {
      const text = await askFallback(systemPrompt, userMessage, 2000);
      onChunk(text);
      return text;
    }
    throw err;
  }
}
