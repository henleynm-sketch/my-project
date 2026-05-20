import { db } from './client.js';

const upsertContactStmt = db.prepare(`
  INSERT INTO contacts (full_name, company, headline, segment, source, source_ref, notes)
  VALUES (@full_name, @company, @headline, @segment, @source, @source_ref, @notes)
  ON CONFLICT(id) DO UPDATE SET
    company = excluded.company,
    headline = excluded.headline,
    updated_at = CURRENT_TIMESTAMP
  RETURNING id
`);

const findContactBySourceRefStmt = db.prepare(
  `SELECT id FROM contacts WHERE source = ? AND source_ref = ? LIMIT 1`,
);

const insertContactStmt = db.prepare(`
  INSERT INTO contacts (full_name, company, headline, segment, source, source_ref, notes)
  VALUES (@full_name, @company, @headline, @segment, @source, @source_ref, @notes)
`);

const updateContactStmt = db.prepare(`
  UPDATE contacts SET
    full_name = COALESCE(@full_name, full_name),
    company   = COALESCE(@company, company),
    headline  = COALESCE(@headline, headline),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
`);

// Upsert by (source, source_ref). Returns the contact id.
export function upsertContact(input) {
  const row = {
    full_name: input.full_name,
    company: input.company || null,
    headline: input.headline || null,
    segment: input.segment || null,
    source: input.source,
    source_ref: input.source_ref || null,
    notes: input.notes || null,
  };
  if (row.source_ref) {
    const existing = findContactBySourceRefStmt.get(row.source, row.source_ref);
    if (existing) {
      updateContactStmt.run({ ...row, id: existing.id });
      return existing.id;
    }
  }
  const info = insertContactStmt.run(row);
  return info.lastInsertRowid;
}

const insertChannelStmt = db.prepare(`
  INSERT OR IGNORE INTO contact_channels
    (contact_id, channel, address, mode, is_primary)
  VALUES (@contact_id, @channel, @address, @mode, @is_primary)
`);

export function addChannel({ contactId, channel, address, mode, isPrimary = false }) {
  if (!address) return null;
  insertChannelStmt.run({
    contact_id: contactId,
    channel,
    address,
    mode,
    is_primary: isPrimary ? 1 : 0,
  });
}

export function countContacts() {
  return db.prepare(`SELECT COUNT(*) AS n FROM contacts`).get().n;
}

export function countChannels() {
  return db.prepare(`SELECT COUNT(*) AS n FROM contact_channels`).get().n;
}
