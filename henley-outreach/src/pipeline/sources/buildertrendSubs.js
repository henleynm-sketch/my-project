// BuilderTrend Subs xlsx adapter.
// Primary identity is the Company name; the human is in "Primary contact".

import xlsx from 'xlsx';
import { normalizeEmail, normalizePhone } from '../normalize.js';

function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

export function parseBuilderTrendSubs(filepath) {
  const wb = xlsx.readFile(filepath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: null, raw: false });

  const out = [];
  for (const row of rows) {
    const company = pick(row, 'Company');
    const primaryContact = pick(row, 'Primary contact');
    const fullName = primaryContact || company;
    if (!fullName) continue;

    const email = normalizeEmail(pick(row, 'Email'));
    const cell = normalizePhone(pick(row, 'Cell'));
    const phone = normalizePhone(pick(row, 'Phone'));
    const division = pick(row, 'Division');
    const tradeStatus = pick(row, 'Trade agreement status');
    const activation = pick(row, 'Activation');

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
      firstName: null,
      lastName: null,
      company,
      headline: division,
      segment: 'subcontractor',
      notes: [
        tradeStatus ? `Trade agreement: ${tradeStatus}` : null,
        activation ? `Activation: ${activation}` : null,
      ].filter(Boolean).join('\n') || null,
      source: 'buildertrend_subs',
      sourceRef: company || `${fullName}|${email || cell || phone || ''}`,
      channels,
    });
  }
  return out;
}
