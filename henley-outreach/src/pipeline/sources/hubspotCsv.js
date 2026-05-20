// HubSpot full contacts export (CSV).
//
// 281 columns; we only care about a small subset. Maps Lifecycle Stage to
// segment, pulls multiple phone numbers + LinkedIn URL into channels.

import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { normalizeEmail, normalizePhone, normalizeLinkedInUrl } from '../normalize.js';

const LIFECYCLE_TO_SEGMENT = {
  Customer: 'client',
  Evangelist: 'evangelist',
  'Marketing Qualified Lead': 'lead',
  'Sales Qualified Lead': 'lead',
  Opportunity: 'opportunity',
  Lead: 'lead',
  Subscriber: 'subscriber',
  Other: null,
};

function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

export function parseHubSpotCsv(filepath) {
  const raw = readFileSync(filepath, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
  });

  const out = [];
  for (const row of rows) {
    const first = pick(row, 'First Name');
    const last = pick(row, 'Last Name');
    const fullName = [first, last].filter(Boolean).join(' ').trim();
    if (!fullName) continue;

    const recordId = pick(row, 'Record ID');
    const email = normalizeEmail(pick(row, 'Email', 'Work email'));
    const mobile = normalizePhone(pick(row, 'Mobile Phone Number'));
    const phone = normalizePhone(pick(row, 'Phone Number'));
    const whatsappRaw = normalizePhone(pick(row, 'WhatsApp Phone Number'));
    const linkedinUrl = normalizeLinkedInUrl(pick(row, 'LinkedIn URL'));
    const jobTitle = pick(row, 'Job Title');
    const company = pick(row, 'Company Name');
    const lifecycle = pick(row, 'Lifecycle Stage');
    const leadStatus = pick(row, 'Lead Status');
    const lastActivity = pick(row, 'Last Activity Date');
    const projectType = pick(row, 'Project Type');
    const serviceInterest = pick(row, 'Service Interest');

    const channels = [];
    if (email) channels.push({ channel: 'email', address: email, isPrimary: true });
    if (mobile) {
      channels.push({ channel: 'sms', address: mobile, isPrimary: true });
      // Mobile doubles as default WhatsApp unless an explicit WA number is set
      if (!whatsappRaw) channels.push({ channel: 'whatsapp', address: mobile });
    } else if (phone) {
      channels.push({ channel: 'sms', address: phone });
    }
    if (whatsappRaw) channels.push({ channel: 'whatsapp', address: whatsappRaw, isPrimary: true });
    if (linkedinUrl) channels.push({ channel: 'linkedin', address: linkedinUrl });

    const segment = lifecycle ? (LIFECYCLE_TO_SEGMENT[lifecycle] ?? 'other') : null;

    out.push({
      fullName,
      firstName: first,
      lastName: last,
      company,
      headline: jobTitle,
      segment,
      hubspotContactId: recordId,
      notes: [
        lifecycle ? `Lifecycle: ${lifecycle}` : null,
        leadStatus ? `Lead status: ${leadStatus}` : null,
        projectType ? `Project type: ${projectType}` : null,
        serviceInterest ? `Service interest: ${serviceInterest}` : null,
        lastActivity ? `Last activity: ${lastActivity}` : null,
      ].filter(Boolean).join('\n') || null,
      source: 'hubspot_csv',
      sourceRef: recordId,
      channels,
    });
  }
  return out;
}
