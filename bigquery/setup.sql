-- ============================================================
-- Lower Cross Media Intelligence Platform
-- BigQuery Setup — Run this ONCE before creating views
-- ============================================================

-- 1. Create datasets (Fivetran creates facebook_ads / google_ads automatically)
CREATE SCHEMA IF NOT EXISTS `analytics`
  OPTIONS(description='Normalized views the app queries');

CREATE SCHEMA IF NOT EXISTS `config`
  OPTIONS(description='Client configuration');

CREATE SCHEMA IF NOT EXISTS `attribution`
  OPTIONS(description='Northbeam and Triple Whale data');

-- 2. Client configuration table
-- Maps ad platform account IDs to your internal client IDs.
-- Insert a row here for each client BEFORE views will return data.
CREATE TABLE IF NOT EXISTS `config.clients` (
  id                          STRING NOT NULL,
  name                        STRING NOT NULL,
  meta_account_id             STRING,          -- e.g. 'act_123456789' (matches facebook_ads.basic_ad.account_id)
  google_customer_id          STRING,          -- e.g. '1234567890' (matches google_ads.campaign_stats.customer_id)
  northbeam_brand_id          STRING,
  triple_whale_brand_id       STRING,
  target_mer                  FLOAT64 DEFAULT 3.5,
  target_contribution_margin_pct FLOAT64 DEFAULT 35.0,
  created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- 3. Attribution tables — you populate these from Northbeam / Triple Whale

CREATE TABLE IF NOT EXISTS `attribution.triple_whale_daily` (
  date                        DATE NOT NULL,
  client_id                   STRING NOT NULL,   -- must match config.clients.id
  total_ad_spend              FLOAT64,
  total_revenue               FLOAT64,           -- Shopify actual revenue
  total_orders                INT64,
  mer                         FLOAT64,
  amer                        FLOAT64,
  new_customer_revenue        FLOAT64,
  returning_customer_revenue  FLOAT64,
  contribution_margin         FLOAT64,
  contribution_margin_pct     FLOAT64
);

CREATE TABLE IF NOT EXISTS `attribution.northbeam_daily` (
  date                        DATE NOT NULL,
  client_id                   STRING NOT NULL,
  channel                     STRING,            -- 'meta', 'google', 'tiktok', etc.
  campaign_id                 STRING,
  campaign_name               STRING,
  spend                       FLOAT64,
  revenue                     FLOAT64,           -- Northbeam attributed revenue
  orders                      INT64,
  new_customer_revenue        FLOAT64,
  returning_customer_revenue  FLOAT64,
  roas                        FLOAT64,
  mer                         FLOAT64,
  cpa                         FLOAT64,
  aov                         FLOAT64
);

-- Example: insert your first client
-- INSERT INTO `config.clients` (id, name, meta_account_id, google_customer_id, target_mer, target_contribution_margin_pct)
-- VALUES ('client-uuid-here', 'Elevate Wellness Co.', 'act_123456789', '1234567890', 3.5, 35.0);
