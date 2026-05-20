import { channels } from '../config.js';
import * as outlook from './outlook.js';
import * as openphone from './openphone.js';
import * as whatsapp from './whatsapp.js';
import * as meta from './meta.js';
import * as linkedin from './linkedin.js';

const transports = { outlook, openphone, whatsapp, meta, linkedin };

// Resolve a connector for a given channel name (email, sms, etc.).
// Returns null for action_list channels with no transport.
export function getConnector(channel) {
  const spec = channels[channel];
  if (!spec) throw new Error(`Unknown channel: ${channel}`);
  if (!spec.transport) return null;
  const conn = transports[spec.transport];
  if (!conn) throw new Error(`No connector loaded for transport: ${spec.transport}`);
  return conn;
}

// Uniform shape every connector exports:
//   async send({ to, subject?, body, contactId, attemptId }) -> { transportMessageId, raw }
//   async testConnection() -> { ok: boolean, detail: any }
