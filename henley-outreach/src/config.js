import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  defaultLookbackDays: Number(process.env.DEFAULT_LOOKBACK_DAYS) || 30,
  nickHubspotOwnerId: process.env.NICK_HUBSPOT_OWNER_ID || null,
  anthropicApiKey: () => required('ANTHROPIC_API_KEY'),
  hubspotAccessToken: () => required('HUBSPOT_ACCESS_TOKEN'),
};

export const brand = {
  company: 'Henley Contracting Ltd.',
  principal: 'Nick Henley, P.Eng., MBA',
  founded: 1989,
  hq: 'Oshawa, Ontario',
  service_area: ['Durham Region', 'Kawartha Lakes', 'Northumberland', 'Muskoka'],
  affiliations: ['DRHBA', 'OHBA', 'CHBA'],
};
