import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { systemPrompt, userPrompt, getChannelRules } from './prompts.js';

let cachedClient = null;
function getClient() {
  if (cachedClient) return cachedClient;
  cachedClient = new Anthropic({ apiKey: config.anthropicApiKey() });
  return cachedClient;
}

function extractJson(text) {
  // Be tolerant of accidental wrapping prose or fenced code blocks.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fence ? fence[1] : text).trim();
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`Model did not return JSON. Got: ${text.slice(0, 200)}`);
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

export async function draftMessage({ contact, channel, intent }) {
  const rules = getChannelRules(channel);
  const client = getClient();

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: systemPrompt(),
    messages: [{ role: 'user', content: userPrompt({ contact, channel, intent }) }],
  });

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const parsed = extractJson(text);
  if (rules.needsSubject && !parsed.subject) {
    throw new Error(`Channel ${channel} requires a subject but model omitted it.`);
  }
  if (!parsed.body) throw new Error('Model returned no body.');

  return {
    subject: parsed.subject || null,
    body: parsed.body,
    model: res.model,
    usage: res.usage,
  };
}
