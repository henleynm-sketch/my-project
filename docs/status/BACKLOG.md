# Backlog

Living list of work across Henley Contracting's parallel Claude branches.
Edit freely — Claude reads this every morning via `/daily`.

Convention: `[ ]` = open, `[x]` = done (keep done items for ~1 week then prune).

---

## Henley Hub (platform) — `claude/henley-hub-platform-2wIAN`

### In flight
- [ ] Verify BT import works end-to-end in Codespace — first login, click around, paste any errors
- [ ] Confirm all 7 import files load (contacts, leads, subs, jobsites, milestones, profitability, hubspot)

### Next up
- [x] 2026-08-01 — Subs directory (list + detail) at `/subs`, filtered to `Vendor.type ===
  "Subcontractor"`, reusing the Vendor model/actions (no schema change). List has
  search/compliance filters + inline add; detail page (new — Vendors itself still has no
  detail route) has contact info, COI/W-9 badges, inline edit, archive. Nav entry added for
  CEO/OFFICE.
  - Deliberately NOT done as part of this: a CSV-import path that creates Vendor rows (the
    "BT subs import" in the item title). The generic importer (`Settings → Import data`)
    only creates Client/Job records today (`IMPORT_SOURCES`/`IMPORT_FIELDS` in
    `lib/importPresets.ts`) — extending it to also target Vendor needs a real design pass
    (field set, source preset, dedup rule), not a bolt-on. Subs are added by hand via
    "+ Add sub" for now.
- [ ] Add a `buildertrend-subs` import preset that creates/updates `Vendor` rows (type=Subcontractor)
  through the Settings → Import data wizard — the piece deferred above
- [ ] Build out **Contracts** stub: Estimate → Contract conversion + PDF + e-sign + deposit
- [ ] **Files** module: per-project library with role visibility (R2/S3)
- [ ] **Selections** module: client-facing approval flow with deadlines
- [ ] **QuickBooks Online** OAuth + customer/invoice/payment sync (schema already has `qbCustomerId`)
- [ ] **Field time clock** tied to daily log hours
- [ ] **Email/SMS gateway**: outbound delivery + inbound parsing (UI is real, transport is not)

### Decisions deferred (Nick to decide)
- [ ] **Henley Hub vs JobTread** — evaluate JT seriously (build read-only JT MCP server?)
- [ ] **Deploy to Vercel + Neon Postgres** for a shareable preview URL — yes/no/when?
- [ ] **SQLite → Postgres** migration — before or after first deploy?

---

## Marketing Hub — `claude/marketing-hub-setup-zE3Tu`

### Last known state
- Worklist UI with draft/approve/skip flow shipped
- HubSpot priority scoring from engagement signals shipped
- Multi-source ingest with cross-source dedup shipped
- Send button → connector dispatcher (dry-run) shipped

### Next up
- [ ] (Nick: fill in — I haven't deep-reviewed this branch yet. Want me to do a walkthrough?)

---

## Side branches (status unclear — Nick to triage)

| Branch | Purpose | Last activity |
|---|---|---|
| `claude/buildertrend-drive-automation-5HWcc` | Playwright BT daily-log → Drive photo sync | ? |
| `claude/automate-linkedin-networking-qDfP6` | LinkedIn networking toolkit | ? |
| `claude/download-marketing-skills-NHRdm` | MS 365 + SharePoint estimating | ? |
| `claude/summarize-recent-emails-ie0ca` | Outlook email summarizer + book outline | ? |
| `claude/update-claude-md-99U0k` | One commit — likely abandoned, can probably delete | dormant |

---

## Blocked / waiting

- (none right now)

---

## Done recently

- 2026-05-22 — CRM search + stage filter + source filter + pagination (henley-hub)
- 2026-05-22 — Codespaces Server Actions origin fix (henley-hub)
- 2026-05-22 — BT data importer (`npm run db:reset:bt`) (henley-hub)
