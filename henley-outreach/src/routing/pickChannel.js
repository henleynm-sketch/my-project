import { db } from '../db/client.js';

// Static channel preference, lowest = best.
// Email first because it is the most reversible / least intrusive.
// LinkedIn last because it is action-list only (no auto-send).
const PREFERENCE = ['email', 'sms', 'whatsapp', 'messenger', 'instagram', 'linkedin'];

const META_WINDOW_HOURS = 24;

const listChannelsStmt = db.prepare(`
  SELECT id, channel, address, mode, is_primary, last_inbound_at
    FROM contact_channels
   WHERE contact_id = ?
`);

function isWithinMetaWindow(lastInboundAt) {
  if (!lastInboundAt) return false;
  const t = new Date(lastInboundAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < META_WINDOW_HOURS * 3600 * 1000;
}

// Returns the chosen channel row for this contact, or null if none reachable.
// "Reachable" excludes Meta channels outside the 24h customer-service window.
export function pickChannel(contactId) {
  const rows = listChannelsStmt.all(contactId);
  if (rows.length === 0) return null;

  const reachable = rows.filter((r) => {
    if (r.channel === 'messenger' || r.channel === 'instagram') {
      return isWithinMetaWindow(r.last_inbound_at);
    }
    return true;
  });
  if (reachable.length === 0) return null;

  reachable.sort((a, b) => {
    const pa = PREFERENCE.indexOf(a.channel);
    const pb = PREFERENCE.indexOf(b.channel);
    if (pa !== pb) return pa - pb;
    // Within the same channel, prefer the primary address.
    return (b.is_primary || 0) - (a.is_primary || 0);
  });
  return reachable[0];
}

export const _internal = { PREFERENCE, META_WINDOW_HOURS, isWithinMetaWindow };
