// Meta Graph — Facebook Messenger + Instagram DM.
// Both ride the same /me/messages endpoint with a page access token.
// 24h window rule: only sendable to users who messaged the Page/IG-business in the last 24h
// unless using an approved message tag. Caller is responsible for checking last_inbound_at.

import { config } from '../config.js';

const GRAPH = 'https://graph.facebook.com/v20.0';

async function sendToRecipient({ recipientId, body }) {
  const { pageAccessToken } = config.meta();
  const res = await fetch(
    `${GRAPH}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: body },
        messaging_type: 'RESPONSE',
      }),
    },
  );
  if (!res.ok) throw new Error(`Meta send ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { transportMessageId: json?.message_id || null, raw: json };
}

// Address shape:
//   messenger -> Page-scoped ID (PSID)
//   instagram -> Instagram-scoped ID (IGSID)
// Both are passed as `to`.
export async function send({ to, body }) {
  return sendToRecipient({ recipientId: to, body });
}

export async function testConnection() {
  const { pageAccessToken, pageId } = config.meta();
  const res = await fetch(
    `${GRAPH}/${pageId}?fields=name,id&access_token=${encodeURIComponent(pageAccessToken)}`,
  );
  if (!res.ok) return { ok: false, detail: `${res.status}: ${await res.text()}` };
  return { ok: true, detail: await res.json() };
}
