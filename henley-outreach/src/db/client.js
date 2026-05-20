import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, 'henley-outreach.db');
const schemaPath = join(__dirname, 'schema.sql');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(readFileSync(schemaPath, 'utf8'));

export function close() {
  db.close();
}
