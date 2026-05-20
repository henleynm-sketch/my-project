import { db } from '../db/client.js';
import { pickChannel } from './pickChannel.js';

// Build the daily worklist: every contact, with its currently chosen channel
// and the most recent draft on that channel (if any). Ranked by priority_score.
//
// A contact appears in the worklist if it has at least one reachable channel.
// Status field on the entry reflects the latest attempt for that channel:
//   - "needs_draft"  no attempt yet
//   - "draft"        an unsent draft is waiting for review
//   - "queued"       approved and queued to send
//   - "sent"         most recent attempt was sent (still surface for follow-up tracking)
//   - "replied"      they replied; drop from worklist by default
const latestAttemptStmt = db.prepare(`
  SELECT id, status, draft_subject, draft_body, channel
    FROM outreach_attempts
   WHERE contact_id = ? AND contact_channel_id = ?
   ORDER BY created_at DESC
   LIMIT 1
`);

export function buildWorklist({ limit = 100, includeReplied = false } = {}) {
  // Only consider contacts with at least one reachable channel — otherwise the
  // limit is "burned" on contacts pickChannel() will reject anyway.
  const contacts = db
    .prepare(
      `SELECT c.id, c.full_name, c.company, c.headline, c.segment, c.priority_score
         FROM contacts c
        WHERE EXISTS (SELECT 1 FROM contact_channels cc WHERE cc.contact_id = c.id)
        ORDER BY c.priority_score DESC NULLS LAST, c.id ASC
        LIMIT ?`,
    )
    .all(limit);

  const out = [];
  for (const c of contacts) {
    const channel = pickChannel(c.id);
    if (!channel) continue;

    const latest = latestAttemptStmt.get(c.id, channel.id);
    const status = latest ? latest.status : 'needs_draft';
    if (status === 'replied' && !includeReplied) continue;

    out.push({
      contact: c,
      channel: {
        id: channel.id,
        channel: channel.channel,
        address: channel.address,
        mode: channel.mode,
      },
      attempt: latest || null,
      status,
    });
  }
  return out;
}
