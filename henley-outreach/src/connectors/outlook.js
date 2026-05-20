// Outlook / Microsoft 365 email via Microsoft Graph.
// Auth: client-credentials flow against an Azure App Registration with Mail.Send.
// Send endpoint: POST /users/{senderUpn}/sendMail
// Docs: https://learn.microsoft.com/graph/api/user-sendmail

import { config } from '../config.js';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const TOKEN_URL = (tenantId) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const { tenantId, clientId, clientSecret } = config.msGraph();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const res = await fetch(TOKEN_URL(tenantId), { method: 'POST', body });
  if (!res.ok) throw new Error(`MS token error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.token;
}

export async function send({ to, subject, body }) {
  const { senderUpn } = config.msGraph();
  const token = await getAccessToken();
  const payload = {
    message: {
      subject: subject || '(no subject)',
      body: { contentType: 'Text', content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: true,
  };
  const res = await fetch(`${GRAPH}/users/${encodeURIComponent(senderUpn)}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Graph sendMail ${res.status}: ${await res.text()}`);
  // sendMail returns 202 with no body; no native message id is exposed here.
  return { transportMessageId: null, raw: { status: res.status } };
}

export async function testConnection() {
  const { senderUpn } = config.msGraph();
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH}/users/${encodeURIComponent(senderUpn)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, detail: `${res.status}: ${await res.text()}` };
  return { ok: true, detail: await res.json() };
}
