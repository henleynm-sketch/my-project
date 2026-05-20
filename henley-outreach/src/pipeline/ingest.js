// LinkedIn connections CSV → contacts + contact_channels.
//
// Standard LinkedIn export columns:
//   First Name, Last Name, URL, Email Address, Company, Position, Connected On
//
// Usage:
//   npm run ingest -- path/to/Connections.csv
// Defaults to data/Connections.csv if no path is given.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { channels } from '../config.js';
import { upsertContact, addChannel, countContacts, countChannels } from '../db/contacts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// LinkedIn prefixes the CSV with a "Notes:" banner — skip until the header row.
function stripLinkedInPreamble(raw) {
  const lines = raw.split(/\r?\n/);
  // Real header row starts with "First Name," — distinguishes it from the preamble
  // text that mentions column names inside a quoted sentence.
  const headerIdx = lines.findIndex((l) => /^\s*"?First Name"?\s*,/i.test(l));
  if (headerIdx <= 0) return raw;
  return lines.slice(headerIdx).join('\n');
}

function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

export function ingestLinkedInCsv(csvPath) {
  const raw = readFileSync(csvPath, 'utf8');
  const cleaned = stripLinkedInPreamble(raw);
  const rows = parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  let added = 0;
  let emailsAdded = 0;
  let liUrlsAdded = 0;

  for (const row of rows) {
    const first = pick(row, 'First Name', 'first_name');
    const last = pick(row, 'Last Name', 'last_name');
    const fullName = [first, last].filter(Boolean).join(' ').trim();
    if (!fullName) continue;

    const url = pick(row, 'URL', 'Profile URL');
    const email = pick(row, 'Email Address', 'Email');
    const company = pick(row, 'Company', 'Current Company');
    const position = pick(row, 'Position', 'Title', 'Headline');

    const contactId = upsertContact({
      full_name: fullName,
      company,
      headline: position,
      source: 'linkedin_csv',
      source_ref: url,
    });
    added++;

    if (url) {
      addChannel({
        contactId,
        channel: 'linkedin',
        address: url,
        mode: channels.linkedin.mode,
        isPrimary: !email,
      });
      liUrlsAdded++;
    }
    if (email) {
      addChannel({
        contactId,
        channel: 'email',
        address: email.toLowerCase(),
        mode: channels.email.mode,
        isPrimary: true,
      });
      emailsAdded++;
    }
  }

  return { processed: rows.length, contactsTouched: added, emailsAdded, liUrlsAdded };
}

// Run directly via `npm run ingest -- <path>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  const defaultPath = join(__dirname, '..', '..', 'data', 'Connections.csv');
  const csvPath = arg ? resolve(arg) : defaultPath;

  if (!existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    console.error(
      `Export LinkedIn → Settings → Data privacy → Get a copy of your data → Connections.`,
    );
    process.exit(1);
  }

  const result = ingestLinkedInCsv(csvPath);
  console.log('Ingest complete:', result);
  console.log(`Contacts in DB: ${countContacts()} | channel rows: ${countChannels()}`);
}
