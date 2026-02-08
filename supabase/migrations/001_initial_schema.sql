-- Lower Cross Media Intelligence Platform - Initial Schema
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  meta_account_id TEXT,
  google_account_id TEXT,
  northbeam_api_key TEXT,
  shopify_store_url TEXT,
  target_mer NUMERIC(10,2),
  target_contribution_margin_pct NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- daily_metrics table (the core data table)
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  channel TEXT NOT NULL, -- 'meta', 'google', 'northbeam'
  campaign_id TEXT,
  campaign_name TEXT,
  adset_id TEXT,
  adset_name TEXT,
  ad_id TEXT,
  ad_name TEXT,
  spend NUMERIC(12,2) DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions NUMERIC(12,2) DEFAULT 0,
  roas NUMERIC(10,4),
  cpa NUMERIC(10,2),
  cpm NUMERIC(10,2),
  ctr NUMERIC(8,4),
  cvr NUMERIC(8,4),
  aov NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, date, channel, campaign_id, adset_id, ad_id)
);

-- creative_assets table
CREATE TABLE creative_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  ad_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  thumbnail_url TEXT,
  creative_type TEXT, -- 'ugc', 'static', 'video', 'carousel'
  hook_type TEXT,
  offer_type TEXT,
  first_seen DATE,
  last_seen DATE,
  total_spend NUMERIC(12,2) DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  total_impressions BIGINT DEFAULT 0,
  total_clicks BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'fatigued', 'paused'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- mer_snapshots for tracking MER over time
CREATE TABLE mer_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_spend NUMERIC(12,2),
  total_revenue NUMERIC(12,2),
  mer NUMERIC(10,4),
  amer NUMERIC(10,4),
  contribution_margin NUMERIC(12,2),
  UNIQUE(client_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_daily_metrics_client_date ON daily_metrics(client_id, date);
CREATE INDEX idx_daily_metrics_channel ON daily_metrics(channel);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX idx_creative_assets_client ON creative_assets(client_id);
CREATE INDEX idx_creative_assets_status ON creative_assets(status);
CREATE INDEX idx_mer_snapshots_client_date ON mer_snapshots(client_id, date);

-- Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mer_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allowing all for now, add auth later)
CREATE POLICY "Allow all for clients" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for daily_metrics" ON daily_metrics FOR ALL USING (true);
CREATE POLICY "Allow all for creative_assets" ON creative_assets FOR ALL USING (true);
CREATE POLICY "Allow all for mer_snapshots" ON mer_snapshots FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for clients table
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
