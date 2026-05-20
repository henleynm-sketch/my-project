// Ingest dispatcher. Auto-detects file type from name, or accepts an explicit
// --source flag. Routes to the right adapter, runs cross-source dedup, prints
// a summary.
//
// Usage:
//   npm run ingest -- data/_fixtures/HubSpotContacts.csv
//   npm run ingest -- --source linkedin data/Connections.csv
//   npm run ingest -- data/_fixtures/*.xlsx data/_fixtures/HubSpotContacts.csv

import { basename, resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { channels as channelRegistry } from '../config.js';
import { ingestRecord, countContacts, countChannels, countBySegment, countByChannel } from '../db/contacts.js';
import { parseLinkedInCsv } from './sources/linkedinCsv.js';
import { parseBuilderTrendLeads } from './sources/buildertrendLeads.js';
import { parseBuilderTrendSubs } from './sources/buildertrendSubs.js';
import { parseBuilderTrendClients } from './sources/buildertrendClients.js';
import { parseHubSpotCsv } from './sources/hubspotCsv.js';

const SOURCES = {
  linkedin: parseLinkedInCsv,
  hubspot:  parseHubSpotCsv,
  leads:    parseBuilderTrendLeads,
  subs:     parseBuilderTrendSubs,
  clients:  parseBuilderTrendClients,
};

function autoDetect(filepath) {
  const name = basename(filepath).toLowerCase();
  if (/connections.*\.csv$/.test(name)) return 'linkedin';
  if (/allcontacts|hubspot.*\.csv$/.test(name)) return 'hubspot';
  if (/^leads.*\.xlsx?$/.test(name) || /leads_\d+/.test(name)) return 'leads';
  if (/^subs.*\.xlsx?$/.test(name)) return 'subs';
  if (/client.*\.xlsx?$/.test(name)) return 'clients';
  return null;
}

function parseArgs(argv) {
  const out = { files: [], forcedSource: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') {
      out.forcedSource = argv[++i];
    } else if (!a.startsWith('--')) {
      out.files.push(a);
    }
  }
  return out;
}

function channelModeFor(channel) {
  return channelRegistry[channel]?.mode || 'auto';
}

function ingestFile(filepath, forcedSource) {
  const source = forcedSource || autoDetect(filepath);
  if (!source) {
    throw new Error(`Could not auto-detect source for ${filepath}. Pass --source <linkedin|hubspot|leads|subs|clients>.`);
  }
  const parser = SOURCES[source];
  if (!parser) throw new Error(`Unknown source: ${source}`);

  console.log(`\n→ ${filepath} (as ${source})`);
  const records = parser(filepath);
  let created = 0;
  let merged = 0;
  for (const rec of records) {
    const { created: isNew } = ingestRecord(rec, channelModeFor);
    if (isNew) created++;
    else merged++;
  }
  console.log(`   parsed: ${records.length}  new: ${created}  merged-into-existing: ${merged}`);
}

const args = parseArgs(process.argv);
if (args.files.length === 0) {
  console.error(`Usage: npm run ingest -- [--source <type>] <file> [<file>...]`);
  console.error(`Source types: linkedin | hubspot | leads | subs | clients`);
  process.exit(1);
}

for (const f of args.files) {
  const fp = resolve(f);
  if (!existsSync(fp) || !statSync(fp).isFile()) {
    console.error(`Not a file: ${fp}`);
    process.exit(1);
  }
  ingestFile(fp, args.forcedSource);
}

console.log('\n=== Summary ===');
console.log(`Total contacts:  ${countContacts()}`);
console.log(`Total channels:  ${countChannels()}`);
console.log(`\nBy segment:`);
for (const r of countBySegment()) console.log(`  ${r.segment.padEnd(20)} ${r.n}`);
console.log(`\nBy channel:`);
for (const r of countByChannel()) console.log(`  ${r.channel.padEnd(20)} ${r.n}`);
