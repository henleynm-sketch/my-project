// WhatsApp Business — Meta Cloud API.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
// Cold outreach REQUIRES a pre-approved message template.
// `body` here is treated as a freeform message (only valid inside the 24h customer-service window).
// Template sending will land alongside drafting in a later phase.

import { config } from '../config.js';

const GRAPH = 'https://graph.facebook.com/v20.0';

export async function send({ to, body }) {
  const { accessToken, phoneNumberId } = config.whatsapp();
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp send ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { transportMessageId: json?.messages?.[0]?.id || null, raw: json };
}

export async function testConnection() {
  const { accessToken, phoneNumberId } = config.whatsapp();
  const res = await fetch(`${GRAPH}/${phoneNumberId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { ok: false, detail: `${res.status}: ${await res.text()}` };
  return { ok: true, detail: await res.json() };
}
