-- Lower Cross Media Intelligence Platform — SQLite Schema
-- Local credential storage with encrypted API keys

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Per-client API keys (AES-256-GCM encrypted)
  northbeam_client_id TEXT,
  northbeam_key_encrypted TEXT,
  triple_whale_key_encrypted TEXT,
  shopify_token_encrypted TEXT,
  shopify_store TEXT,
  -- Legacy fields (kept for BigQuery view mapping)
  meta_account_id TEXT,
  google_account_id TEXT,
  -- Performance targets
  target_mer REAL DEFAULT 3.5,
  target_contribution_margin_pct REAL DEFAULT 35.0,
  -- Monthly pacing goals (for Northbeam-lite)
  monthly_spend_target REAL,
  monthly_revenue_target REAL,
  cogs_pct REAL DEFAULT 0.45,
  -- BigQuery client mapping
  bigquery_client_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Northbeam daily data cache (channel + campaign level)
CREATE TABLE IF NOT EXISTS northbeam_daily (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  client_id TEXT NOT NULL,
  date TEXT NOT NULL,
  channel TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  spend REAL DEFAULT 0,
  revenue REAL DEFAULT 0,
  new_customer_revenue REAL DEFAULT 0,
  returning_customer_revenue REAL DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  roas REAL,
  cac REAL,
  fetched_at TEXT DEFAULT (datetime('now')),
  UNIQUE(client_id, date, channel, campaign_id)
);

-- Northbeam creative/ad level cache
CREATE TABLE IF NOT EXISTS northbeam_creative (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  client_id TEXT NOT NULL,
  date_start TEXT NOT NULL,
  date_end TEXT NOT NULL,
  channel TEXT,
  campaign_name TEXT,
  ad_id TEXT,
  ad_name TEXT,
  spend REAL DEFAULT 0,
  revenue REAL DEFAULT 0,
  new_customer_revenue REAL DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  roas REAL,
  cac REAL,
  cpm REAL,
  ctr REAL,
  fetched_at TEXT DEFAULT (datetime('now')),
  UNIQUE(client_id, date_start, date_end, channel, ad_id)
);

-- Northbeam sync state
CREATE TABLE IF NOT EXISTS northbeam_sync (
  client_id TEXT PRIMARY KEY,
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'idle',
  error_message TEXT,
  export_id TEXT
);
