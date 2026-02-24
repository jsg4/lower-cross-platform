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
  -- BigQuery client mapping
  bigquery_client_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
