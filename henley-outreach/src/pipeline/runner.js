// Send dispatcher. Given an attempt id, looks up the contact channel,
// resolves the right connector, fires it (or dry-runs), updates the attempt.
//
// Safety:
//   - LIVE_SEND env var must equal '1' for any real network call to happen.
//   - Without it, every send is logged + marked as 'sent' with a dry-run note
//     so the user can drive the full UI flow without spending external API
//     credits or messaging real people.
//   - Action-list channels (LinkedIn) bypass connectors entirely; "send" just
//     updates the attempt status because the user pastes the message manually.

import { db } from '../db/client.js';
import { setAttemptStatus } from '../db/attempts.js';
import { getConnector } from '../connectors/index.js';
import { channels as channelRegistry } from '../config.js';

function loadAttempt(id) {
  const attempt = db.prepare(`SELECT * FROM outreach_attempts WHERE id = ?`).get(id);
  if (!attempt) throw new Error(`No attempt with id=${id}`);
  const channel = db
    .prepare(`SELECT * FROM contact_channels WHERE id = ?`)
    .get(attempt.contact_channel_id);
  if (!channel) throw new Error(`Attempt ${id} has no channel row.`);
  const contact = db
    .prepare(`SELECT * FROM contacts WHERE id = ?`)
    .get(attempt.contact_id);
  return { attempt, channel, contact };
}

function isLive() {
  return process.env.LIVE_SEND === '1';
}

export async function sendAttempt(attemptId) {
  const { attempt, channel, contact } = loadAttempt(attemptId);

  // Refuse to send anything that isn't approved or freshly drafted.
  if (!['approved', 'draft', 'queued'].includes(attempt.status)) {
    throw new Error(
      `Attempt ${attemptId} is in status '${attempt.status}', not eligible to send.`,
    );
  }

  const spec = channelRegistry[channel.channel];
  if (!spec) throw new Error(`Unknown channel: ${channel.channel}`);

  // Action-list channels: manual paste, no transport call.
  if (spec.mode === 'action_list') {
    setAttemptStatus({ id: attemptId, status: 'sent' });
    return {
      mode: 'manual',
      sent: true,
      detail: `${channel.channel} is action-list; marked sent without transport call.`,
    };
  }

  // Hybrid channels (messenger, instagram): require 24h customer-service window.
  if (spec.mode === 'hybrid') {
    const lastInbound = channel.last_inbound_at
      ? new Date(channel.last_inbound_at).getTime()
      : 0;
    const withinWindow = Date.now() - lastInbound < 24 * 60 * 60 * 1000;
    if (!withinWindow) {
      throw new Error(
        `${channel.channel} is outside the 24h customer-service window. Surface as action list instead.`,
      );
    }
  }

  const payload = {
    to: channel.address,
    subject: attempt.draft_subject || undefined,
    body: attempt.draft_body,
    contactId: contact.id,
    attemptId,
  };

  if (!isLive()) {
    console.log(
      `[DRY-RUN] would send via ${channel.channel} -> ${channel.address}`,
    );
    if (payload.subject) console.log(`  subject: ${payload.subject}`);
    console.log(`  body (first 120 chars): ${payload.body.slice(0, 120)}`);
    setAttemptStatus({
      id: attemptId,
      status: 'sent',
      transportMessageId: 'dry-run',
    });
    return { mode: 'dry-run', sent: true, payload };
  }

  // LIVE: dispatch to the real connector.
  const connector = getConnector(channel.channel);
  if (!connector) throw new Error(`No connector for ${channel.channel}`);

  try {
    const result = await connector.send(payload);
    setAttemptStatus({
      id: attemptId,
      status: 'sent',
      transportMessageId: result?.transportMessageId || null,
    });
    return { mode: 'live', sent: true, result };
  } catch (err) {
    setAttemptStatus({
      id: attemptId,
      status: 'failed',
      sendError: err.message.slice(0, 500),
    });
    throw err;
  }
}

export function liveSendEnabled() {
  return isLive();
}
