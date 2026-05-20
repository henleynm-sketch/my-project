// LinkedIn Connections CSV adapter (moved out of pipeline/ingest.js).

import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { normalizeEmail, normalizeLinkedInUrl } from '../normalize.js';

function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

// LinkedIn prefixes the CSV with a quoted "Notes:" banner. Skip lines until
// we find a real header row that starts with "First Name,".
function stripPreamble(raw) {
  const lines = raw.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /^\s*"?First Name"?\s*,/i.test(l));
  if (headerIdx <= 0) return raw;
  return lines.slice(headerIdx).join('\n');
}

export function parseLinkedInCsv(filepath) {
  const cleaned = stripPreamble(readFileSync(filepath, 'utf8'));
  const rows = parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  const out = [];
  for (const row of rows) {
    const first = pick(row, 'First Name', 'first_name');
    const last = pick(row, 'Last Name', 'last_name');
    const fullName = [first, last].filter(Boolean).join(' ').trim();
    if (!fullName) continue;

    const url = normalizeLinkedInUrl(pick(row, 'URL', 'Profile URL'));
    const email = normalizeEmail(pick(row, 'Email Address', 'Email'));
    const company = pick(row, 'Company', 'Current Company');
    const position = pick(row, 'Position', 'Title', 'Headline');

    const channels = [];
    if (email) channels.push({ channel: 'email', address: email, isPrimary: true });
    if (url) channels.push({ channel: 'linkedin', address: url, isPrimary: !email });

    out.push({
      fullName,
      firstName: first,
      lastName: last,
      company,
      headline: position,
      segment: null,
      source: 'linkedin_csv',
      sourceRef: url,
      channels,
    });
  }
  return out;
}
