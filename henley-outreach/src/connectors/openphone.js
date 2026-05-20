// OpenPhone (Quo) — SMS via the OpenPhone public API.
// Docs: https://www.openphone.com/docs/api-reference
// Send endpoint: POST https://api.openphone.com/v1/messages

import { config } from '../config.js';

const API = 'https://api.openphone.com/v1';

export async function send({ to, body }) {
  const { apiKey, fromNumber } = config.openPhone();
  const res = await fetch(`${API}/messages`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromNumber,
      to: [to],
      content: body,
    }),
  });
  if (!res.ok) throw new Error(`OpenPhone send ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { transportMessageId: json?.data?.id || null, raw: json };
}

export async function testConnection() {
  const { apiKey } = config.openPhone();
  const res = await fetch(`${API}/phone-numbers`, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) return { ok: false, detail: `${res.status}: ${await res.text()}` };
  return { ok: true, detail: await res.json() };
}
