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

### Social Media Platforms
- **Nick personally:** LinkedIn
- **Henley Contracting:** Instagram, Facebook, TikTok
- **Scheduling tools:** Repurpose.io (video cross-posting), Meta Business Suite or similar for scheduling
- **Project content source:** BuilderTrend (has all project info, photos, timelines)
