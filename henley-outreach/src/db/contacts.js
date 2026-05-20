import { db } from './client.js';

const findByHubspotIdStmt = db.prepare(
  `SELECT id FROM contacts WHERE hubspot_contact_id = ? LIMIT 1`,
);

const findBySourceRefStmt = db.prepare(
  `SELECT id FROM contacts WHERE source = ? AND source_ref = ? LIMIT 1`,
);

const findByAddressStmt = db.prepare(
  `SELECT contact_id AS id FROM contact_channels
    WHERE channel = ? AND address = ? LIMIT 1`,
);

const insertContactStmt = db.prepare(`
  INSERT INTO contacts
    (full_name, company, headline, segment, source, source_ref, hubspot_contact_id, notes,
     lifecycle_stage, last_activity_at, last_contacted_at,
     emails_opened, emails_clicked, emails_replied)
  VALUES
    (@full_name, @company, @headline, @segment, @source, @source_ref, @hubspot_contact_id, @notes,
     @lifecycle_stage, @last_activity_at, @last_contacted_at,
     @emails_opened, @emails_clicked, @emails_replied)
`);

const updateContactStmt = db.prepare(`
  UPDATE contacts SET
    full_name = COALESCE(@full_name, full_name),
    company   = COALESCE(@company, company),
    headline  = COALESCE(@headline, headline),
    segment   = COALESCE(@segment, segment),
    hubspot_contact_id = COALESCE(@hubspot_contact_id, hubspot_contact_id),
    lifecycle_stage   = COALESCE(@lifecycle_stage, lifecycle_stage),
    last_activity_at  = COALESCE(@last_activity_at, last_activity_at),
    last_contacted_at = COALESCE(@last_contacted_at, last_contacted_at),
    emails_opened  = MAX(COALESCE(emails_opened, 0),  COALESCE(@emails_opened, 0)),
    emails_clicked = MAX(COALESCE(emails_clicked, 0), COALESCE(@emails_clicked, 0)),
    emails_replied = MAX(COALESCE(emails_replied, 0), COALESCE(@emails_replied, 0)),
    notes     = CASE
                  WHEN @notes IS NULL THEN notes
                  WHEN notes IS NULL THEN @notes
                  ELSE notes || char(10) || '---' || char(10) || @notes
                END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
`);

const insertChannelStmt = db.prepare(`
  INSERT OR IGNORE INTO contact_channels
    (contact_id, channel, address, mode, is_primary)
  VALUES (@contact_id, @channel, @address, @mode, @is_primary)
`);

// Cross-source dedup lookup. Returns existing contact id or null.
// Priority: HubSpot id -> same-source ref -> any channel address match.
function findExistingContact(rec) {
  if (rec.hubspotContactId) {
    const hit = findByHubspotIdStmt.get(rec.hubspotContactId);
    if (hit) return hit.id;
  }
  if (rec.sourceRef) {
    const hit = findBySourceRefStmt.get(rec.source, rec.sourceRef);
    if (hit) return hit.id;
  }
  for (const ch of rec.channels || []) {
    if (!ch.address) continue;
    const hit = findByAddressStmt.get(ch.channel, ch.address);
    if (hit) return hit.id;
  }
  return null;
}

// Insert a normalized record, merging into any existing contact that shares
// a HubSpot ID, source ref, or channel address. Returns { contactId, created }.
export function ingestRecord(rec, channelModeFor) {
  const sig = rec.signals || {};
  const row = {
    full_name: rec.fullName,
    company: rec.company || null,
    headline: rec.headline || null,
    segment: rec.segment || null,
    source: rec.source,
    source_ref: rec.sourceRef || null,
    hubspot_contact_id: rec.hubspotContactId || null,
    notes: rec.notes || null,
    lifecycle_stage: sig.lifecycle_stage || null,
    last_activity_at: sig.last_activity_at || null,
    last_contacted_at: sig.last_contacted_at || null,
    emails_opened: sig.emails_opened || 0,
    emails_clicked: sig.emails_clicked || 0,
    emails_replied: sig.emails_replied || 0,
  };

  let contactId = findExistingContact(rec);
  let created = false;

  if (contactId) {
    updateContactStmt.run({ ...row, id: contactId });
  } else {
    const info = insertContactStmt.run(row);
    contactId = Number(info.lastInsertRowid);
    created = true;
  }

  for (const ch of rec.channels || []) {
    if (!ch.address) continue;
    insertChannelStmt.run({
      contact_id: contactId,
      channel: ch.channel,
      address: ch.address,
      mode: channelModeFor(ch.channel),
      is_primary: ch.isPrimary ? 1 : 0,
    });
  }
  return { contactId, created };
}

export function countContacts() {
  return db.prepare(`SELECT COUNT(*) AS n FROM contacts`).get().n;
}

export function countChannels() {
  return db.prepare(`SELECT COUNT(*) AS n FROM contact_channels`).get().n;
}

export function countBySegment() {
  return db
    .prepare(`SELECT COALESCE(segment, '(none)') AS segment, COUNT(*) AS n FROM contacts GROUP BY segment ORDER BY n DESC`)
    .all();
}

export function countByChannel() {
  return db
    .prepare(`SELECT channel, COUNT(*) AS n FROM contact_channels GROUP BY channel ORDER BY n DESC`)
    .all();
}
