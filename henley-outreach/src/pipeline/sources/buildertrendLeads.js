// BuilderTrend Leads xlsx adapter.
//
// File shape:
//   row 0: "Leads (exported on <date>)" banner — skip
//   row 1: actual header row
//   row 2+: data
//
// Output: normalized records for the ingest pipeline.

import xlsx from 'xlsx';
import { normalizeEmail, normalizePhone } from '../normalize.js';

function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

export function parseBuilderTrendLeads(filepath) {
  const wb = xlsx.readFile(filepath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // range:1 -> skip the banner row, use row 1 as the header
  const rows = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: null, raw: false });

  const out = [];
  for (const row of rows) {
    const first = pick(row, 'First Name');
    const last = pick(row, 'Last Name');
    const contactString = pick(row, 'Client Contact');
    const fullName = [first, last].filter(Boolean).join(' ').trim() || contactString;
    if (!fullName) continue;

    const email = normalizeEmail(pick(row, 'Email Address', 'Email'));
    const cell = normalizePhone(pick(row, 'Cell Phone'));
    const phone = normalizePhone(pick(row, 'Phone'));
    const oppTitle = pick(row, 'Opportunity Title');
    const projectType = pick(row, 'Project Type', 'Project Type*');
    const leadStatus = pick(row, 'Lead Status');
    const salesperson = pick(row, 'Salesperson');
    const notes = pick(row, 'Notes');
    const estMin = pick(row, 'Estimated Revenue Min');
    const estMax = pick(row, 'Estimated Revenue Max');
    const source = pick(row, 'Source', 'Lead Source*', 'How did you hear about us*');

    const channels = [];
    if (email) channels.push({ channel: 'email', address: email });
    if (cell) {
      channels.push({ channel: 'sms', address: cell, isPrimary: true });
      channels.push({ channel: 'whatsapp', address: cell });
    } else if (phone) {
      channels.push({ channel: 'sms', address: phone });
    }

    out.push({
      fullName,
      firstName: first,
      lastName: last,
      company: null,
      headline: [projectType, oppTitle].filter(Boolean).join(' — ') || null,
      segment: 'lead',
      notes: [
        leadStatus ? `Lead status: ${leadStatus}` : null,
        salesperson ? `Salesperson: ${salesperson}` : null,
        estMin || estMax ? `Est revenue: ${estMin || '?'}–${estMax || '?'}` : null,
        source ? `Source: ${source}` : null,
        notes,
      ].filter(Boolean).join('\n') || null,
      source: 'buildertrend_leads',
      sourceRef: oppTitle || `${fullName}|${email || cell || phone || ''}`,
      channels,
    });
  }
  return out;
}
