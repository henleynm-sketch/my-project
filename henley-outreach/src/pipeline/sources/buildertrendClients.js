// BuilderTrend Client Contacts xlsx adapter.

import xlsx from 'xlsx';
import { normalizeEmail, normalizePhone } from '../normalize.js';

function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

export function parseBuilderTrendClients(filepath) {
  const wb = xlsx.readFile(filepath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: null, raw: false });

  const out = [];
  for (const row of rows) {
    const name = pick(row, 'Name');
    const first = pick(row, 'First Name');
    const last = pick(row, 'Last Name');
    const fullName = name || [first, last].filter(Boolean).join(' ').trim();
    if (!fullName) continue;

    const email = normalizeEmail(pick(row, 'Email'));
    const cell = normalizePhone(pick(row, 'Cell'));
    const phone = normalizePhone(pick(row, 'Phone'));
    const activation = pick(row, 'Activation Status');
    const jobs = pick(row, 'Jobs');

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
      headline: null,
      segment: 'client',
      notes: [
        activation ? `Activation: ${activation}` : null,
        jobs ? `Jobs: ${jobs}` : null,
      ].filter(Boolean).join('\n') || null,
      source: 'buildertrend_clients',
      sourceRef: fullName + (email ? `|${email}` : ''),
      channels,
    });
  }
  return out;
}
