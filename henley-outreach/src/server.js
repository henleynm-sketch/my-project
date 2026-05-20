import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, channels as channelRegistry } from './config.js';
import { db } from './db/client.js';
import { countContacts, countChannels } from './db/contacts.js';
import { createDraft, setAttemptStatus } from './db/attempts.js';
import { buildWorklist } from './routing/worklist.js';
import { draftMessage } from './drafting/draft.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'web')));

app.get('/health', (_req, res) => {
  const attempts = db.prepare('SELECT COUNT(*) AS n FROM outreach_attempts').get().n;
  res.json({
    ok: true,
    phase: 1,
    contacts: countContacts(),
    channels: countChannels(),
    attempts,
  });
});

app.get('/contacts', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const rows = db
    .prepare(
      `SELECT c.id, c.full_name, c.company, c.headline, c.segment, c.priority_score,
              GROUP_CONCAT(cc.channel) AS channels
         FROM contacts c
         LEFT JOIN contact_channels cc ON cc.contact_id = c.id
         GROUP BY c.id
         ORDER BY c.priority_score DESC NULLS LAST, c.id DESC
         LIMIT ?`,
    )
    .all(limit);
  res.json({ count: rows.length, contacts: rows });
});

app.get('/worklist', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const includeAll = req.query.includeAll === '1';
  const items = buildWorklist({ limit, includeAll });
  res.json({ count: items.length, items });
});

app.get('/contacts/:id', (req, res) => {
  const contact = db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(Number(req.params.id));
  if (!contact) return res.status(404).json({ error: 'not found' });
  const chs = db
    .prepare(`SELECT * FROM contact_channels WHERE contact_id = ?`)
    .all(Number(req.params.id));
  const attempts = db
    .prepare(`SELECT * FROM outreach_attempts WHERE contact_id = ? ORDER BY created_at DESC`)
    .all(Number(req.params.id));
  res.json({ contact, channels: chs, attempts });
});

// Generate a draft for a contact on a given channel and persist as a draft attempt.
app.post('/contacts/:id/draft', async (req, res) => {
  try {
    const contactId = Number(req.params.id);
    const { channel, intent } = req.body || {};
    if (!channel) return res.status(400).json({ error: 'channel required' });
    const contact = db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(contactId);
    if (!contact) return res.status(404).json({ error: 'contact not found' });

    const result = await draftMessage({ contact, channel, intent: intent || null });
    const id = createDraft({
      contactId,
      channel,
      subject: result.subject,
      body: result.body,
    });
    const attempt = db.prepare(`SELECT * FROM outreach_attempts WHERE id = ?`).get(id);
    res.json({ attempt, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/attempts/:id', (req, res) => {
  const id = Number(req.params.id);
  const { subject, body } = req.body || {};
  const existing = db.prepare(`SELECT * FROM outreach_attempts WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare(
    `UPDATE outreach_attempts SET
       draft_subject = COALESCE(?, draft_subject),
       draft_body = COALESCE(?, draft_body),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  ).run(subject ?? null, body ?? null, id);
  const attempt = db.prepare(`SELECT * FROM outreach_attempts WHERE id = ?`).get(id);
  res.json({ attempt });
});

// Skip a contact without drafting — creates a stub attempt marked skipped so
// they don't reappear on next refresh.
app.post('/contacts/:id/skip', (req, res) => {
  const contactId = Number(req.params.id);
  const { channel } = req.body || {};
  if (!channel) return res.status(400).json({ error: 'channel required' });
  const id = createDraft({
    contactId,
    channel,
    subject: null,
    body: '[skipped before drafting]',
  });
  setAttemptStatus({ id, status: 'skipped' });
  const attempt = db.prepare(`SELECT * FROM outreach_attempts WHERE id = ?`).get(id);
  res.json({ attempt });
});

app.post('/attempts/:id/approve', (req, res) => {
  const id = Number(req.params.id);
  setAttemptStatus({ id, status: 'approved' });
  const attempt = db.prepare(`SELECT * FROM outreach_attempts WHERE id = ?`).get(id);
  res.json({ attempt });
});

app.post('/attempts/:id/skip', (req, res) => {
  const id = Number(req.params.id);
  setAttemptStatus({ id, status: 'skipped' });
  const attempt = db.prepare(`SELECT * FROM outreach_attempts WHERE id = ?`).get(id);
  res.json({ attempt });
});

// Mark an attempt as sent without actually firing the connector. Used for
// action-list channels (LinkedIn) after the user pastes the message manually.
app.post('/attempts/:id/mark-sent', (req, res) => {
  const id = Number(req.params.id);
  setAttemptStatus({ id, status: 'sent' });
  const attempt = db.prepare(`SELECT * FROM outreach_attempts WHERE id = ?`).get(id);
  res.json({ attempt });
});

app.listen(config.port, () => {
  console.log(`henley-outreach listening on http://localhost:${config.port}`);
});
