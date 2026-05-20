-- henley-outreach local state
-- One row per contact/connection we might reach out to.
-- Channel is decided at enrichment time: 'email' if HubSpot has an email, else 'linkedin'.

CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  linkedin_url TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  headline TEXT,
  company TEXT,
  connected_on DATE,
  hubspot_contact_id TEXT,
  hubspot_company_id TEXT,
  hubspot_context_json TEXT,         -- JSON blob from enrichment step
  email TEXT,                         -- from CSV or HubSpot; gates the email channel
  channel TEXT,                       -- 'email' (auto-sendable) | 'linkedin' (action list)
  segment TEXT,                       -- warm|peer|prospect|strategic|skip
  draft_message TEXT,
  draft_subject TEXT,                 -- only used when channel='email'
  priority_score REAL,                -- for ranking the daily action list (higher = do first)
  status TEXT,                        -- pending|approved|sent|skipped|replied|failed
  approved_at DATETIME,
  sent_at DATETIME,
  send_error TEXT,                    -- populated if auto-send fails
  follow_up_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_segment ON connections(segment);
CREATE INDEX IF NOT EXISTS idx_connections_channel ON connections(channel);
CREATE INDEX IF NOT EXISTS idx_connections_priority ON connections(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_connections_follow_up_date ON connections(follow_up_date);
