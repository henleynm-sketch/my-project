# Henley Contracting Ltd — Claude Code Configuration

## Company Info
- **Company:** Henley Contracting Ltd
- **Location:** Oshawa, Ontario, Canada
- **Services:** General contracting — custom cottages, residential additions, renovations, commercial projects, land development
- **Currency:** CAD

## Estimating Workflow

### How Estimates Work
1. Receive bid invitation / RFQ via email (MS 365 Outlook)
2. Review drawings and specifications
3. Perform quantity takeoffs by CSI division
4. Apply unit costs from our pricing database
5. Collect sub-trade quotes (via email)
6. Assemble estimate with markup, contingency, and overhead
7. Generate bid submission document
8. Send bid via email

### CSI Divisions We Typically Estimate
- Division 01 — General Requirements (site supervision, temp facilities, insurance, bonds)
- Division 02 — Existing Conditions (demolition, abatement)
- Division 03 — Concrete (foundations, flatwork, forming)
- Division 04 — Masonry (block, brick, stone veneer)
- Division 05 — Metals (structural steel, misc metals, railings)
- Division 06 — Wood/Plastics/Composites (framing, millwork, cabinetry, trim)
- Division 07 — Thermal & Moisture Protection (insulation, roofing, waterproofing, siding)
- Division 08 — Openings (windows, doors, hardware)
- Division 09 — Finishes (drywall, painting, flooring, tile)
- Division 10 — Specialties (bath accessories, signage)
- Division 22 — Plumbing (sub-trade)
- Division 23 — HVAC (sub-trade)
- Division 26 — Electrical (sub-trade)
- Division 31 — Earthwork (excavation, grading, fill)
- Division 32 — Exterior Improvements (paving, landscaping, retaining walls)
- Division 33 — Utilities (water, sewer, storm)

### Sub-Trade Management
- Sub-trade quotes come in via email
- Track which subs have been invited, quoted, and selected
- Compare multiple quotes per trade
- Flag low/high outliers

## MS 365 Integration (MCP Server)
This project uses the `@softeria/ms-365-mcp-server` MCP server for:
- **Email:** Read incoming RFQs, sub-trade quotes; draft and send bid submissions
- **Excel/OneDrive:** Read/write estimating spreadsheets, pricing databases
- **Calendar:** Track bid deadlines, site visit dates

### Setup Required
Before using MS 365 tools, you must:
1. Register an Azure AD app (see setup-guide.md)
2. Replace placeholder values in `.claude/settings.json` with your Azure Client ID and Tenant ID
3. Run `npx -y @softeria/ms-365-mcp-server --login` to authenticate via browser

## File Structure
- `estimating/templates/` — Estimate spreadsheet templates
- `estimating/` — Active project estimates
- `.agents/skills/` — Marketing and other AI skills
- `.claude/` — Claude Code configuration and custom commands

## Preferences
- All dollar amounts in CAD unless specified
- Ontario Building Code (OBC) applies
- HST rate: 13%
- WSIB and liability insurance are included in overhead
- Standard markup structure: cost + overhead + profit
