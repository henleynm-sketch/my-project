import express from 'express';
import { config } from './config.js';
import { db } from './db/client.js';
import { countContacts, countChannels } from './db/contacts.js';
import { buildWorklist } from './routing/worklist.js';

const app = express();
app.use(express.json());

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
  const includeReplied = req.query.includeReplied === '1';
  const items = buildWorklist({ limit, includeReplied });
  res.json({ count: items.length, items });
});

app.listen(config.port, () => {
  console.log(`henley-outreach listening on http://localhost:${config.port}`);
});
