# henley-outreach

Hybrid outreach tool for Nick Henley (Henley Contracting Ltd.).

- **Email channel** — when HubSpot has an email, the tool auto-sends and logs the engagement.
- **LinkedIn channel** — when there is no email, the tool produces a ranked daily action list: one click to copy the draft, one click to open the contact's LinkedIn, one click to mark as sent. No LinkedIn automation, no ToS risk.

## Phase 1 status

Scaffold + DB schema + HubSpot connector with one test call. Not yet wired into a full pipeline. Email transport (Gmail API vs HubSpot transactional vs SMTP) will be chosen in Phase 5.

## Setup

```bash
cp .env.example .env
# fill in ANTHROPIC_API_KEY and HUBSPOT_ACCESS_TOKEN
npm install
```

## Verify Phase 1

```bash
npm run test:hubspot   # hits HubSpot /account-info/v3/details and prints portal info
npm start              # boots Express on http://localhost:3000 with a health route
```

Full README (HubSpot private-app setup, LinkedIn CSV export, weekly workflow) lands in Phase 6.
