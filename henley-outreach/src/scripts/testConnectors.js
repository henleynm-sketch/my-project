// Smoke-test every configured connector. Skips any whose required env vars are missing.
import { channels } from '../config.js';
import { getConnector } from '../connectors/index.js';

const results = [];

for (const [channel, spec] of Object.entries(channels)) {
  if (!spec.transport) {
    results.push({ channel, status: 'skipped', detail: 'action-list only' });
    continue;
  }
  const conn = getConnector(channel);
  try {
    const out = await conn.testConnection();
    results.push({ channel, status: out.ok ? 'ok' : 'fail', detail: out.detail });
  } catch (err) {
    results.push({ channel, status: 'error', detail: err.message });
  }
}

for (const r of results) {
  const tag = r.status === 'ok' ? 'OK' : r.status.toUpperCase();
  console.log(`[${tag}] ${r.channel}`);
  if (r.status !== 'ok') {
    const d = typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail);
    console.log(`       ${d.slice(0, 300)}`);
  }
}
