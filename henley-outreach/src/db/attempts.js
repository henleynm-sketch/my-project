import { db } from './client.js';

const insertAttemptStmt = db.prepare(`
  INSERT INTO outreach_attempts
    (contact_id, contact_channel_id, channel, draft_subject, draft_body, status, priority_score)
  VALUES (@contact_id, @contact_channel_id, @channel, @draft_subject, @draft_body, @status, @priority_score)
`);

const updateStatusStmt = db.prepare(`
  UPDATE outreach_attempts SET
    status = @status,
    send_error = @send_error,
    transport_message_id = @transport_message_id,
    sent_at = CASE WHEN @status = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
`);

const listForContactStmt = db.prepare(`
  SELECT * FROM outreach_attempts WHERE contact_id = ? ORDER BY created_at DESC
`);

const findChannelStmt = db.prepare(`
  SELECT id FROM contact_channels
   WHERE contact_id = ? AND channel = ?
   ORDER BY is_primary DESC, id ASC
   LIMIT 1
`);

export function createDraft({ contactId, channel, subject, body, priorityScore = null }) {
  const ch = findChannelStmt.get(contactId, channel);
  if (!ch) throw new Error(`Contact ${contactId} has no ${channel} channel registered.`);
  const info = insertAttemptStmt.run({
    contact_id: contactId,
    contact_channel_id: ch.id,
    channel,
    draft_subject: subject || null,
    draft_body: body,
    status: 'draft',
    priority_score: priorityScore,
  });
  return info.lastInsertRowid;
}

export function setAttemptStatus({ id, status, sendError = null, transportMessageId = null }) {
  updateStatusStmt.run({
    id,
    status,
    send_error: sendError,
    transport_message_id: transportMessageId,
  });
}

export function listAttemptsForContact(contactId) {
  return listForContactStmt.all(contactId);
}
