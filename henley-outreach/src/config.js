import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name) {
  return process.env[name] || null;
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  defaultLookbackDays: Number(process.env.DEFAULT_LOOKBACK_DAYS) || 30,
  nickHubspotOwnerId: optional('NICK_HUBSPOT_OWNER_ID'),

  anthropicApiKey: () => required('ANTHROPIC_API_KEY'),
  hubspotAccessToken: () => required('HUBSPOT_ACCESS_TOKEN'),

  // Microsoft Graph (Outlook email) — app registration credentials
  msGraph: () => ({
    tenantId: required('MS_GRAPH_TENANT_ID'),
    clientId: required('MS_GRAPH_CLIENT_ID'),
    clientSecret: required('MS_GRAPH_CLIENT_SECRET'),
    senderUpn: required('MS_GRAPH_SENDER_UPN'),
  }),

  // OpenPhone / Quo — SMS + voice
  openPhone: () => ({
    apiKey: required('OPENPHONE_API_KEY'),
    fromNumber: required('OPENPHONE_FROM_NUMBER'),
  }),

  // Meta WhatsApp Business API
  whatsapp: () => ({
    accessToken: required('META_WA_ACCESS_TOKEN'),
    phoneNumberId: required('META_WA_PHONE_NUMBER_ID'),
  }),

  // Meta Graph for Messenger + Instagram DM
  meta: () => ({
    pageAccessToken: required('META_PAGE_ACCESS_TOKEN'),
    pageId: required('META_PAGE_ID'),
    igUserId: optional('META_IG_USER_ID'),
  }),
};

export const brand = {
  company: 'Henley Contracting Ltd.',
  principal: 'Nick Henley, P.Eng., MBA',
  founded: 1989,
  hq: 'Oshawa, Ontario',
  service_area: ['Durham Region', 'Kawartha Lakes', 'Northumberland', 'Muskoka'],
  affiliations: ['DRHBA', 'OHBA', 'CHBA'],
};

// Channel registry — declares which mode each channel runs in.
export const channels = {
  email:     { mode: 'auto',        transport: 'outlook'   },
  sms:       { mode: 'auto',        transport: 'openphone' },
  whatsapp:  { mode: 'auto',        transport: 'whatsapp'  },
  messenger: { mode: 'hybrid',      transport: 'meta'      },
  instagram: { mode: 'hybrid',      transport: 'meta'      },
  linkedin:  { mode: 'action_list', transport: null        },
};
