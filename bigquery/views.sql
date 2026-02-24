-- ============================================================
-- Lower Cross Media Intelligence Platform
-- BigQuery Views — Run AFTER Fivetran has completed first sync
-- ============================================================
-- These views normalize Fivetran's raw tables into the shape
-- the app expects. The app only queries the analytics.* views.
--
-- IMPORTANT: Replace `your-project` with your GCP project ID
-- in all table references below if needed. If datasets are in
-- the default project, you can omit the project prefix.
-- ============================================================


-- ============================================================
-- 1. META ADS — Daily performance at adset level
-- ============================================================
-- Joins basic_ad metrics with action/action_value tables to get
-- purchase conversions and revenue, then joins to history tables
-- for campaign/adset/ad names, and config.clients for client_id.
-- ============================================================

CREATE OR REPLACE VIEW `analytics.v_meta_daily` AS
WITH

-- Get purchase conversions (count)
purchases AS (
  SELECT
    ad_id,
    date,
    COALESCE(SUM(value), 0) AS conversions
  FROM `facebook_ads.basic_ad_actions`
  WHERE action_type = 'offsite_conversion.fb_pixel_purchase'
  GROUP BY ad_id, date
),

-- Get purchase revenue (value)
purchase_values AS (
  SELECT
    ad_id,
    date,
    COALESCE(SUM(value), 0) AS revenue
  FROM `facebook_ads.basic_ad_action_values`
  WHERE action_type = 'offsite_conversion.fb_pixel_purchase'
  GROUP BY ad_id, date
),

-- Latest campaign name (Fivetran uses SCD type 2)
campaigns AS (
  SELECT id, name, account_id
  FROM `facebook_ads.campaign_history`
  WHERE _fivetran_active = TRUE
),

-- Latest adset name
adsets AS (
  SELECT id, campaign_id, name
  FROM `facebook_ads.ad_set_history`
  WHERE _fivetran_active = TRUE
),

-- Latest ad → adset mapping
ads AS (
  SELECT id, ad_set_id, name
  FROM `facebook_ads.ad_history`
  WHERE _fivetran_active = TRUE
)

SELECT
  c.id                           AS client_id,
  ba.date,
  'meta'                         AS channel,
  camp.id                        AS campaign_id,
  camp.name                      AS campaign_name,
  adset.id                       AS adset_id,
  adset.name                     AS adset_name,
  ad.id                          AS ad_id,
  ad.name                        AS ad_name,
  ROUND(ba.spend, 2)            AS spend,
  ROUND(COALESCE(pv.revenue, 0), 2) AS revenue,
  ba.impressions,
  ba.inline_link_clicks          AS clicks,
  COALESCE(p.conversions, 0)     AS conversions

FROM `facebook_ads.basic_ad` ba

-- Join ad → adset → campaign hierarchy
LEFT JOIN ads ad ON ba.ad_id = ad.id
LEFT JOIN adsets adset ON ad.ad_set_id = adset.id
LEFT JOIN campaigns camp ON adset.campaign_id = camp.id

-- Join purchase metrics
LEFT JOIN purchases p ON ba.ad_id = p.ad_id AND ba.date = p.date
LEFT JOIN purchase_values pv ON ba.ad_id = pv.ad_id AND ba.date = pv.date

-- Map to client via account_id
INNER JOIN `config.clients` c ON camp.account_id = c.meta_account_id
;


-- ============================================================
-- 2. GOOGLE ADS — Daily performance at ad group level
-- ============================================================
-- Google Ads data is already at ad_group level in Fivetran.
-- cost_micros is divided by 1,000,000 to get actual currency.
-- ============================================================

CREATE OR REPLACE VIEW `analytics.v_google_daily` AS
WITH

campaigns AS (
  SELECT id, name, customer_id
  FROM `google_ads.campaign_history`
  WHERE _fivetran_active = TRUE
),

ad_groups AS (
  SELECT id, campaign_id, name
  FROM `google_ads.ad_group_history`
  WHERE _fivetran_active = TRUE
)

SELECT
  c.id                                     AS client_id,
  s.date,
  'google'                                 AS channel,
  camp.id                                  AS campaign_id,
  camp.name                                AS campaign_name,
  ag.id                                    AS adset_id,        -- adset_id = ad_group_id for Google
  ag.name                                  AS adset_name,
  CAST(NULL AS STRING)                     AS ad_id,
  CAST(NULL AS STRING)                     AS ad_name,
  ROUND(s.cost_micros / 1000000.0, 2)     AS spend,
  ROUND(s.conversions_value, 2)            AS revenue,
  s.impressions,
  s.clicks,
  CAST(ROUND(s.conversions) AS INT64)      AS conversions

FROM `google_ads.ad_group_stats` s

LEFT JOIN ad_groups ag ON s.ad_group_id = ag.id
LEFT JOIN campaigns camp ON ag.campaign_id = camp.id

INNER JOIN `config.clients` c ON camp.customer_id = c.google_customer_id
;


-- ============================================================
-- 3. UNIFIED DAILY METRICS — Union of Meta + Google
-- ============================================================
-- This is the primary view the app queries. It unions both
-- platforms and adds calculated ratio fields.
-- ============================================================

CREATE OR REPLACE VIEW `analytics.v_daily_metrics` AS
SELECT
  *,
  -- Calculated fields
  CASE WHEN spend > 0 THEN ROUND(revenue / spend, 4) ELSE 0 END              AS roas,
  CASE WHEN conversions > 0 THEN ROUND(spend / conversions, 2) ELSE 0 END     AS cpa,
  CASE WHEN impressions > 0 THEN ROUND((spend / impressions) * 1000, 2) ELSE 0 END AS cpm,
  CASE WHEN impressions > 0 THEN ROUND((clicks / impressions) * 100, 4) ELSE 0 END AS ctr,
  CASE WHEN clicks > 0 THEN ROUND((conversions / clicks) * 100, 4) ELSE 0 END AS cvr,
  CASE WHEN conversions > 0 THEN ROUND(revenue / conversions, 2) ELSE 0 END   AS aov

FROM (
  SELECT * FROM `analytics.v_meta_daily`
  UNION ALL
  SELECT * FROM `analytics.v_google_daily`
)
;


-- ============================================================
-- 4. CREATIVE PERFORMANCE — Meta creatives with aggregated metrics
-- ============================================================
-- Aggregates ad-level data by creative, with thumbnail URLs
-- from creative_history. Only Meta (Google PMax assets are
-- handled differently and not yet supported).
-- ============================================================

CREATE OR REPLACE VIEW `analytics.v_creative_performance` AS
WITH

creatives AS (
  SELECT id, name, thumbnail_url, image_url, video_id,
    CASE
      WHEN video_id IS NOT NULL THEN 'video'
      WHEN image_url IS NOT NULL AND name LIKE '%carousel%' THEN 'carousel'
      WHEN image_url IS NOT NULL THEN 'static'
      ELSE 'ugc'
    END AS creative_type
  FROM `facebook_ads.creative_history`
  WHERE _fivetran_active = TRUE
),

ads AS (
  SELECT id, creative_id
  FROM `facebook_ads.ad_history`
  WHERE _fivetran_active = TRUE
)

SELECT
  m.client_id,
  m.ad_id,
  m.channel,
  cr.thumbnail_url,
  cr.creative_type,
  CAST(NULL AS STRING) AS hook_type,          -- not available from API, tag manually
  CAST(NULL AS STRING) AS offer_type,         -- not available from API, tag manually
  CAST(MIN(m.date) AS STRING) AS first_seen,
  CAST(MAX(m.date) AS STRING) AS last_seen,
  ROUND(SUM(m.spend), 2) AS total_spend,
  ROUND(SUM(m.revenue), 2) AS total_revenue,
  SUM(m.impressions) AS total_impressions,
  SUM(m.clicks) AS total_clicks,
  CASE
    WHEN SUM(m.spend) > 0 AND (SUM(m.revenue) / SUM(m.spend)) < 1.5 THEN 'fatigued'
    WHEN MAX(m.date) < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN 'paused'
    ELSE 'active'
  END AS status

FROM `analytics.v_meta_daily` m
LEFT JOIN ads a ON m.ad_id = a.id
LEFT JOIN creatives cr ON a.creative_id = cr.id

WHERE m.ad_id IS NOT NULL
GROUP BY m.client_id, m.ad_id, m.channel, cr.thumbnail_url, cr.creative_type
;


-- ============================================================
-- 5. MER SNAPSHOTS — From Triple Whale (preferred) or Northbeam
-- ============================================================
-- Uses Triple Whale as primary source. If you use Northbeam
-- instead, replace the source table below.
-- ============================================================

CREATE OR REPLACE VIEW `analytics.v_mer_snapshots` AS
SELECT
  client_id,
  date,
  total_ad_spend    AS total_spend,
  total_revenue,
  mer,
  amer,
  contribution_margin
FROM `attribution.triple_whale_daily`

-- To use Northbeam instead, uncomment below and comment above:
-- SELECT
--   client_id,
--   date,
--   SUM(spend)      AS total_spend,
--   SUM(revenue)    AS total_revenue,
--   SAFE_DIVIDE(SUM(revenue), SUM(spend)) AS mer,
--   SAFE_DIVIDE(SUM(revenue), SUM(spend)) * 0.85 AS amer,  -- rough estimate
--   NULL AS contribution_margin
-- FROM `attribution.northbeam_daily`
-- GROUP BY client_id, date
;
