'use strict';

import Anthropic from '@anthropic-ai/sdk';

// ── Provider chain: OpenAI → DeepSeek → Gemini → Claude ───────────────────

const PROVIDERS = [
  {
    name:   'OpenAI',
    envKey: 'OPENAI_API_KEY',
    url:    'https://api.openai.com/v1/chat/completions',
    model:  'gpt-4o-mini',
    type:   'openai',
  },
  {
    name:   'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    url:    'https://api.deepseek.com/chat/completions',
    model:  'deepseek-chat',
    type:   'openai',
  },
  {
    name:   'Gemini',
    envKey: 'GEMINI_API_KEY',
    url:    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model:  'gemini-2.0-flash',
    type:   'openai',
  },
  {
    name:   'Grok',
    envKey: 'XAI_API_KEY',
    url:    'https://api.x.ai/v1/chat/completions',
    model:  'grok-3-mini',
    type:   'openai',
  },
  {
    name:   'Claude',
    envKey: 'ANTHROPIC_API_KEY',
    type:   'anthropic',
  },
];

async function callOpenAICompatible(provider, systemPrompt, userMessage, maxTokens) {
  const res = await fetch(provider.url, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${process.env[provider.envKey]}`,
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
  if (data.error) throw new Error(`${provider.name}: ${data.error.message}`);
  return data.choices[0].message.content;
}

async function callAnthropic(systemPrompt, userMessage, maxTokens) {
  const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  });
  return response.content[0].text;
}

async function askAny(systemPrompt, userMessage, maxTokens) {
  for (const provider of PROVIDERS) {
    if (!process.env[provider.envKey]) continue;

    try {
      const text = provider.type === 'anthropic'
        ? await callAnthropic(systemPrompt, userMessage, maxTokens)
        : await callOpenAICompatible(provider, systemPrompt, userMessage, maxTokens);

      if (PROVIDERS[0].name !== provider.name) {
        console.warn(`[AI] ✅ ${provider.name} responded`);
      }
      return text;
    } catch (err) {
      console.warn(`[AI] ⚠️  ${provider.name} failed (${err.message}) — trying next`);
    }
  }
  throw new Error('All AI providers failed. Check API keys and credits in Render.');
}

// ── Exported functions ─────────────────────────────────────────────────────

export async function askClaude(systemPrompt, userMessage, maxTokens = 1500) {
  return askAny(systemPrompt, userMessage, maxTokens);
}

export async function askClaudeJSON(systemPrompt, userMessage, maxTokens = 1500) {
  const raw = await askAny(
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
  const text = await askAny(systemPrompt, userMessage, 2000);
  onChunk(text);
  return text;
}
