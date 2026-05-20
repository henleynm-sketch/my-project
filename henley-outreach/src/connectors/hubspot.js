import { Client } from '@hubspot/api-client';
import { config } from '../config.js';

let cached = null;

export function getHubspotClient() {
  if (cached) return cached;
  cached = new Client({ accessToken: config.hubspotAccessToken() });
  return cached;
}

/**
 * Test call: fetch HubSpot account/portal details.
 * Used to verify that HUBSPOT_ACCESS_TOKEN is valid.
 */
export async function getAccountInfo() {
  const client = getHubspotClient();
  const res = await client.apiRequest({
    method: 'GET',
    path: '/account-info/v3/details',
  });
  return res.json();
}

// Run directly via `npm run test:hubspot`
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const info = await getAccountInfo();
    console.log('HubSpot connection OK:');
    console.log(JSON.stringify(info, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('HubSpot connection FAILED:');
    console.error(err.message);
    process.exit(1);
  }
}
