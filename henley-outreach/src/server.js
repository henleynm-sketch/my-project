import express from 'express';
import { config } from './config.js';
import { db } from './db/client.js';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  const row = db.prepare('SELECT COUNT(*) AS n FROM connections').get();
  res.json({ ok: true, phase: 1, connections: row.n });
});

app.listen(config.port, () => {
  console.log(`henley-outreach listening on http://localhost:${config.port}`);
});
