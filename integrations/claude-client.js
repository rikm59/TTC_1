'use strict';

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

export async function askClaude(systemPrompt, userMessage, maxTokens = 1500) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0].text;
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
    throw new Error(`Claude returned non-JSON: ${raw.slice(0, 200)}`);
  }
}

export async function askClaudeStream(systemPrompt, userMessage, onChunk) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
      onChunk(chunk.delta.text);
    }
  }
  const final = await stream.finalMessage();
  return final.content[0].text;
}
