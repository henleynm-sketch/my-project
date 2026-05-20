// One-shot drafter: pick a contact + channel, draft a message, persist as a draft attempt.
//
// Usage:
//   npm run draft -- --contact 1 --channel email
//   npm run draft -- --contact 3 --channel linkedin --intent "Ask about their new build"

import { db } from '../db/client.js';
import { draftMessage } from '../drafting/draft.js';
import { createDraft } from '../db/attempts.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

const args = parseArgs(process.argv);
const contactId = Number(args.contact);
const channel = args.channel;
const intent = args.intent || null;

if (!contactId || !channel) {
  console.error('Usage: npm run draft -- --contact <id> --channel <email|sms|linkedin|...> [--intent "..."]');
  process.exit(1);
}

const contact = db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(contactId);
if (!contact) {
  console.error(`No contact with id=${contactId}`);
  process.exit(1);
}

const result = await draftMessage({ contact, channel, intent });
const attemptId = createDraft({
  contactId,
  channel,
  subject: result.subject,
  body: result.body,
});

console.log(`Draft #${attemptId} for ${contact.full_name} via ${channel}`);
if (result.subject) console.log(`Subject: ${result.subject}`);
console.log('---');
console.log(result.body);
console.log('---');
console.log(`tokens: input=${result.usage.input_tokens} output=${result.usage.output_tokens}`);
