# Email Summarizer — Henley Contracting

Fetches recent emails from Outlook, categorizes them by business context (quotes, projects, clients, marketing, etc.), and gives you a clean summary with action items at the top.

## Quick Start

### 1. Azure App Registration (one-time, ~5 min)

1. Go to [portal.azure.com](https://portal.azure.com) > **Azure Active Directory** > **App registrations** > **New registration**
2. Name: `Henley Email Summarizer`
3. Supported account types: **Single tenant**
4. Redirect URI: **Public client/native** → `http://localhost:8400`
5. Click **Register**
6. Copy the **Application (client) ID** and **Directory (tenant) ID**
7. Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions**
8. Add: `Mail.Read`, `Mail.ReadBasic`, `User.Read`
9. Click **Grant admin consent** (or ask your admin)

### 2. Set Environment Variables

```bash
export HENLEY_MS_CLIENT_ID="your-client-id-here"
export HENLEY_MS_TENANT_ID="your-tenant-id-here"
```

Or add them to a `.env` file (not committed to git).

### 3. Install Dependencies

```bash
cd email-summarizer
pip install -r requirements.txt
```

### 4. Run It

```bash
# Default: last 3 days, 25 emails, text format
python main.py

# Last 7 days
python main.py --days 7

# Save to file
python main.py --save

# Markdown format (good for sharing)
python main.py --format markdown --save

# Quick daily scan
python main.py --days 1 --count 50
```

First run will prompt you to sign in via browser (device code flow). After that, tokens are cached locally.

## What It Does

- Connects to your Outlook via Microsoft Graph API
- Fetches recent emails (configurable timeframe)
- Categorizes emails into:
  - **Quotes & Bids** — RFQs, sub quotes, pricing
  - **Projects & Site** — inspections, permits, schedules, BuilderTrend
  - **Client Communication** — homeowner/client emails
  - **Marketing & Leads** — HubSpot, social media, campaigns
  - **Finance** — HST, accounting, payroll
  - **Newsletters & Automated** — filtered out of action items
  - **General** — everything else
- Highlights **action items** (unread emails from real people)
- Flags **high priority** emails
- Outputs clean summary to console or file

## File Structure

```
email-summarizer/
├── main.py           # CLI entry point
├── auth.py           # Microsoft auth (device code flow)
├── graph_client.py   # MS Graph API calls
├── summarizer.py     # Email categorization & summary logic
├── formatter.py      # Text & Markdown output formatting
├── config.py         # Configuration & settings
├── requirements.txt  # Python dependencies
└── output/           # Saved summaries (git-ignored)
```
