# Henley Contracting — Project Context

## Company Overview
- **Name**: Henley Contracting
- **Location**: Ontario, Canada
- **Services**: New build custom homes, additions, renovations, commercial construction

## Construction & Estimating Context
- **Standard**: Ontario Building Code (OBC)
- **Tax**: 13% HST (Ontario Harmonized Sales Tax)
- **Estimating Format**: CSI divisions (MasterFormat)
- **Subcontractor Management**: Competitive bidding process, sub quote comparison
- **Key Documents**: SharePoint templates for estimates, RFQs, bid packages

## Automation Goals

### Estimating Automation
- Pull estimate templates from SharePoint (via MS 365 MCP server)
- Scan Outlook emails for RFQs and subcontractor quotes
- Compare bids across subcontractors for each CSI division
- Generate cost breakdowns with HST calculations

### Marketing Automation
- Generate social media content (project showcases, progress updates)
- Track leads from HubSpot CRM
- Build marketing dashboards with lead pipeline data
- Coordinate marketing campaigns with project milestones

## MCP Server Usage
When working on this project, the **@softeria/ms-365-mcp-server** is available and authenticated.
Use it to:
- Read/send Outlook emails for nick@henleycontracting.com
- Access SharePoint documents and templates
- Read/write Excel spreadsheets for estimates and budgets
- Access OneDrive files

## Remembered Context
<!-- Add session-specific learnings below this line -->

### File Delivery
- All deliverables (spreadsheets, documents, reports) go to **OneDrive > Claude Outputs**
- Use subfolders: `Claude Outputs/Marketing`, `Claude Outputs/Estimates`, etc.
- Upload via MS 365 MCP server after generating files

### Marketing Content System
- Brand messaging, content strategies, and ready-to-post content created (Feb 2026)
- Files in repo: `marketing/` directory
- Content calendar Excel: `marketing/henley-content-calendar.xlsx`
- Generator script: `marketing/generate_calendar.py` (can regenerate/update the calendar)
- Two brands: **Nick on LinkedIn** (personal brand) + **Henley Contracting on IG/FB/TikTok** (company brand)
- Core message: "We build the spaces where families grow together"
- Tagline: "Build. Grow. Together."

### Google Drive — AI-Generated Marketing Docs
Other AI tools are producing marketing content saved to Google Drive. Reference and align with these when creating new content:

| Document | Google Drive Link |
|---|---|
| Marketing Plan | https://drive.google.com/open?id=1XFVp3EJXoVW5FZ2pRMeJCuFoxsk-CoL2 |
| Marketing Plan Research | https://drive.google.com/open?id=1xVBuIb-Q8Ob7LHLZt4ZRKo3dBSUA4str |
| Social Media Tools Research | https://drive.google.com/open?id=1Rk_VGBjq0RJC7UtDRtKy4KhNeUvQpA5r |
| Social Media Content Calendar | https://drive.google.com/open?id=1cHd94LBnRSst9SQt3o9uxqHsB3r_Zcad |
| On-Site Video Production Schedule | https://drive.google.com/open?id=1XyshM4FFW0GtgBWzRQ43OQDQS8bOp91o |

**Access:** Use the `@piotr-agier/google-drive-mcp` MCP server to read/write these files directly (if connected). Otherwise, Nick can paste content into chat or copy files into the repo.

### Book: "From Dream to Doorstep"
- **Full title:** "From Dream to Doorstep: A Guide to Building and Renovating Custom Homes with Confidence"
- **Author:** Nick Henley
- **Format:** Q&A style, professional/practical tone
- **Status:** In progress (co-written with ChatGPT)
- **Outline saved:** `marketing/book/from-dream-to-doorstep-outline.md`
- **Covers:** Part 1 (Planning & Vision, 6 chapters) + Part 2 (Design & Pre-Construction, 2 chapters so far)
- **Use for content:** Each chapter = multiple LinkedIn posts, Instagram carousels, TikTok videos, blog posts, and lead magnets

### Social Media Platforms
- **Nick personally:** LinkedIn
- **Henley Contracting:** Instagram, Facebook, TikTok
- **Scheduling tools:** Repurpose.io (video cross-posting), Meta Business Suite or similar for scheduling
- **Project content source:** BuilderTrend (has all project info, photos, timelines)

### Email Summarizer Tool
- **Location:** `email-summarizer/` directory
- **Purpose:** Fetch recent Outlook emails via Microsoft Graph API, categorize by business context, surface action items
- **Setup:** Requires Azure AD app registration (see `email-summarizer/README.md`)
- **Categories:** Quotes & Bids, Projects & Site, Client Communication, Marketing & Leads, Finance, Newsletters & Automated
- **Auth:** Device code flow (works from CLI or mobile), tokens cached locally
- **Output:** Text or Markdown, can save to `email-summarizer/output/`
