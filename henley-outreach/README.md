# henley-outreach

Omnichannel outreach hub for Nick Henley (Henley Contracting Ltd.).

## Channels

| Channel | Mode | Transport |
|---|---|---|
| Email | auto-send | Microsoft Graph (Outlook / M365) |
| SMS | auto-send | OpenPhone / Quo |
| WhatsApp | auto-send | Meta WhatsApp Business |
| Facebook Messenger | hybrid (24h window) | Meta Graph |
| Instagram DM | hybrid (24h window) | Meta Graph |
| LinkedIn | action list | manual copy-paste |

"Action list" channels surface as a ranked daily worklist; the tool never automates LinkedIn. The Meta channels auto-send only inside the platform-mandated 24h customer-service window — outside it, they fall through to the action list.

## Setup

```bash
cp .env.example .env
# fill in credentials for whichever channels you want enabled — others will be skipped
npm install
```

## Verify

```bash
npm run test:hubspot      # HubSpot account/portal lookup
npm run test:connectors   # smoke-tests every channel whose env vars are configured
npm start                 # boots Express on http://localhost:3000
```

## Status

Phase 1: scaffold, generic channel/contact schema, connector stubs for every transport. No pipeline wired yet — drafting, ranking, and the worklist UI come in later phases.
