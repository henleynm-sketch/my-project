// Priority scoring. Higher = surface higher in the worklist.
//
// Components (each capped, sum capped at 100):
//   segment_weight    0..50  - clients/opportunities > leads > subs > rest
//   recency_bonus     0..30  - decays linearly over 365 days since last_activity
//   engagement_bonus  0..20  - 5 per reply, 2 per click, 1 per open
//   reachability      0..10  - 2 per available channel (max 5 channels)
//
// Run via: npm run rescore

import { db } from '../db/client.js';

const SEGMENT_WEIGHT = {
  client: 50,
  opportunity: 45,
  evangelist: 45,
  lead: 30,
  subcontractor: 20,
  other: 10,
  subscriber: 5,
};

const RECENCY_HORIZON_DAYS = 365;
const ENGAGEMENT_CAP = 20;
const REACHABILITY_CAP = 10;
const TOTAL_CAP = 100;

function segmentWeight(segment) {
  if (!segment) return 0;
  return SEGMENT_WEIGHT[segment] ?? 0;
}

function recencyBonus(lastActivityAt) {
  if (!lastActivityAt) return 0;
  const t = new Date(lastActivityAt).getTime();
  if (Number.isNaN(t)) return 0;
  const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
  if (days < 0) return 30;
  if (days >= RECENCY_HORIZON_DAYS) return 0;
  return 30 * (1 - days / RECENCY_HORIZON_DAYS);
}

function engagementBonus({ emails_opened, emails_clicked, emails_replied }) {
  const raw = (emails_opened || 0) * 1 + (emails_clicked || 0) * 2 + (emails_replied || 0) * 5;
  return Math.min(ENGAGEMENT_CAP, raw);
}

function reachabilityBonus(channelCount) {
  return Math.min(REACHABILITY_CAP, channelCount * 2);
}

export function computeScore(contact, channelCount) {
  const raw =
    segmentWeight(contact.segment) +
    recencyBonus(contact.last_activity_at) +
    engagementBonus(contact) +
    reachabilityBonus(channelCount);
  return Math.min(TOTAL_CAP, raw);
}

const selectAllStmt = db.prepare(`
  SELECT c.id, c.segment, c.last_activity_at,
         c.emails_opened, c.emails_clicked, c.emails_replied,
         (SELECT COUNT(*) FROM contact_channels cc WHERE cc.contact_id = c.id) AS channel_count
    FROM contacts c
`);

const updateScoreStmt = db.prepare(`UPDATE contacts SET priority_score = ? WHERE id = ?`);

export function rescoreAll() {
  const rows = selectAllStmt.all();
  const updateMany = db.transaction((rows) => {
    for (const r of rows) {
      const score = computeScore(r, r.channel_count);
      updateScoreStmt.run(score, r.id);
    }
  });
  updateMany(rows);
  return rows.length;
}

// Run directly via `npm run rescore`
if (import.meta.url === `file://${process.argv[1]}`) {
  const n = rescoreAll();
  console.log(`Rescored ${n} contacts.`);
  const top = db
    .prepare(
      `SELECT id, full_name, segment, priority_score
         FROM contacts
        ORDER BY priority_score DESC NULLS LAST
        LIMIT 10`,
    )
    .all();
  console.log('\nTop 10 by priority:');
  for (const r of top) {
    console.log(
      `  ${String(r.priority_score ?? '').padStart(5)}  #${String(r.id).padEnd(5)} ${(r.full_name || '?').padEnd(30)} ${r.segment || ''}`,
    );
  }
}
