'use strict';

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL  = 'claude-sonnet-4-6';
const OPENAI_MODEL  = 'gpt-4o-mini';
const OPENAI_URL    = 'https://api.openai.com/v1/chat/completions';

// ── OpenAI fallback ────────────────────────────────────────────────────────

function isCreditsError(err) {
  const msg = err.message || '';
  return msg.includes('credit balance') ||
         msg.includes('insufficient_quota') ||
         msg.includes('billing') ||
         err.status === 429;
}

async function askOpenAI(systemPrompt, userMessage, maxTokens) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Anthropic credits exhausted and OPENAI_API_KEY not set — no fallback available');
  }
  console.warn('[AI] ⚠️  Anthropic credits low — falling back to OpenAI GPT-4o-mini');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:      OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`OpenAI fallback error: ${data.error.message}`);
  return data.choices[0].message.content;
}

// ── Primary: Anthropic Claude ──────────────────────────────────────────────

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
    if (isCreditsError(err)) return askOpenAI(systemPrompt, userMessage, maxTokens);
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
  // Streaming falls back to non-streaming OpenAI if Anthropic credits are exhausted
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
      const text = await askOpenAI(systemPrompt, userMessage, 2000);
      onChunk(text);
      return text;
    }
    throw err;
  }
}
