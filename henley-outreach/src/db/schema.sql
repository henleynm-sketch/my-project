-- henley-outreach local state
-- Generic channel model: one contact can be reached on many channels,
-- each outreach attempt is a row with its own status + transport message id.

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  company TEXT,
  headline TEXT,
  segment TEXT,                       -- warm|peer|prospect|strategic|skip
  source TEXT,                        -- linkedin_csv|hubspot|manual
  source_ref TEXT,                    -- linkedin url, hubspot id, etc.
  hubspot_contact_id TEXT,
  hubspot_company_id TEXT,
  hubspot_context_json TEXT,
  priority_score REAL,                -- ranking signal for the daily worklist
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reachable addresses per contact. One contact may have email + phone + LI URL + IG handle.
CREATE TABLE IF NOT EXISTS contact_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,              -- email|sms|whatsapp|messenger|instagram|linkedin
  address TEXT NOT NULL,              -- email addr | E.164 phone | FB PSID | IG IGSID | LI url
  mode TEXT NOT NULL,                 -- auto | action_list | hybrid
  is_primary INTEGER DEFAULT 0,
  last_inbound_at DATETIME,           -- used for Meta 24h-window check
  verified INTEGER DEFAULT 0,
  UNIQUE(contact_id, channel, address)
);

-- One row per drafted/sent outreach. Replies update the same row.
CREATE TABLE IF NOT EXISTS outreach_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES contacts(id),
  contact_channel_id INTEGER NOT NULL REFERENCES contact_channels(id),
  channel TEXT NOT NULL,              -- denormalized for fast filtering
  draft_subject TEXT,                 -- email only
  draft_body TEXT NOT NULL,
  status TEXT NOT NULL,               -- draft|approved|queued|sent|delivered|replied|skipped|failed
  send_error TEXT,
  transport_message_id TEXT,          -- id from Outlook/OpenPhone/Meta after send
  priority_score REAL,
  approved_at DATETIME,
  sent_at DATETIME,
  delivered_at DATETIME,
  replied_at DATETIME,
  follow_up_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_segment ON contacts(segment);
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_contact_channels_contact ON contact_channels(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_channels_channel ON contact_channels(channel);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON outreach_attempts(status);
CREATE INDEX IF NOT EXISTS idx_attempts_channel ON outreach_attempts(channel);
CREATE INDEX IF NOT EXISTS idx_attempts_priority ON outreach_attempts(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_follow_up ON outreach_attempts(follow_up_date);
