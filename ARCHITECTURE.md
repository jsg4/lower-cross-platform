# Lower Cross Media Intelligence Platform — Architecture

## Overview

Dashboard for DTC brands to monitor paid media performance across Meta Ads, Google Ads, and blended attribution (Northbeam / Triple Whale). Six pages: Dashboard, Meta drilldown, Google drilldown, Creative performance, MER tracker, Settings.

## Data Architecture

```
Fivetran (auto-sync)          Manual / API pipes
 ├─ Meta Ads ──────┐          ├─ Northbeam ────┐
 └─ Google Ads ────┤          └─ Triple Whale ──┤
                   ▼                            ▼
              BigQuery                     BigQuery
           (raw tables)               (attribution tables)
                   │                            │
                   └──── BigQuery Views ────────┘
                         (normalized)
                              │
                      Next.js API Routes
                       /api/metrics/*
                              │
                     Client Components
                      (same UI as demo)
```

### Two Modes

| Mode | `NEXT_PUBLIC_DATA_SOURCE` | Rendering | Deploy target | Data |
|------|--------------------------|-----------|--------------|------|
| Demo | unset (default) | Server-side | localhost / Vercel | In-memory seed data |
| Production | `bigquery` | Server-side | Vercel | Live BigQuery queries |
| GH Pages | unset + `STATIC_EXPORT=true` | Static export | GitHub Pages | In-memory seed data (baked at build) |

Set `NEXT_PUBLIC_DATA_SOURCE=bigquery` to activate BigQuery. When unset, the app falls back to seed data so development works without any external services. The GitHub Pages static export is a separate build command used only for the demo site.

---

## BigQuery Schema

### Datasets

| Dataset | Purpose |
|---------|---------|
| `facebook_ads` | Fivetran Meta Ads connector (auto-created by Fivetran) |
| `google_ads` | Fivetran Google Ads connector (auto-created by Fivetran) |
| `attribution` | Northbeam + Triple Whale data (you manage) |
| `analytics` | Normalized views the app queries |
| `config` | Client configuration table |

### Fivetran Tables (auto-created)

**`facebook_ads` dataset** (Fivetran Facebook Ads connector):

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `basic_ad` | `ad_id`, `date`, `account_id`, `impressions`, `inline_link_clicks`, `spend`, `reach`, `frequency` | Daily ad-level metrics |
| `basic_ad_actions` | `ad_id`, `date`, `action_type`, `value`, `_1d_click`, `_7d_click`, `_1d_view` | Conversion events by type |
| `basic_ad_action_values` | Same as actions | Monetary values of conversion events |
| `campaign_history` | `id`, `name`, `account_id`, `status`, `objective` | Campaign metadata (SCD) |
| `ad_set_history` | `id`, `campaign_id`, `name`, `status` | Ad set metadata (SCD) |
| `ad_history` | `id`, `ad_set_id`, `name`, `creative_id` | Ad metadata (SCD) |
| `creative_history` | `id`, `name`, `body`, `title`, `thumbnail_url`, `image_url`, `video_id` | Creative details |

**`google_ads` dataset** (Fivetran Google Ads connector):

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `campaign_stats` | `customer_id`, `campaign_id`, `date`, `impressions`, `clicks`, `cost_micros`, `conversions`, `conversions_value` | Daily campaign metrics |
| `ad_group_stats` | `customer_id`, `ad_group_id`, `campaign_id`, `date`, `impressions`, `clicks`, `cost_micros`, `conversions`, `conversions_value` | Daily ad group metrics |
| `campaign_history` | `id`, `name`, `customer_id`, `status`, `advertising_channel_type` | Campaign metadata (SCD) |
| `ad_group_history` | `id`, `campaign_id`, `name`, `status`, `type` | Ad group metadata (SCD) |

### Attribution Tables (you create and populate)

**`attribution.northbeam_daily`**:
```sql
date              DATE
client_id         STRING        -- maps to config.clients.id
channel           STRING        -- 'meta', 'google', 'tiktok', etc.
campaign_id       STRING        -- nullable
campaign_name     STRING        -- nullable
spend             FLOAT64
revenue           FLOAT64       -- Northbeam attributed revenue
orders            INT64
new_customer_revenue    FLOAT64
returning_customer_revenue FLOAT64
roas              FLOAT64
mer               FLOAT64
cpa               FLOAT64
aov               FLOAT64
```

**`attribution.triple_whale_daily`**:
```sql
date              DATE
client_id         STRING
total_ad_spend    FLOAT64       -- all-platform ad spend
total_revenue     FLOAT64       -- Shopify actual revenue
total_orders      INT64
mer               FLOAT64       -- total_revenue / total_ad_spend
amer              FLOAT64       -- adjusted MER (excluding estimated organic)
new_customer_revenue    FLOAT64
returning_customer_revenue FLOAT64
contribution_margin     FLOAT64
contribution_margin_pct FLOAT64
```

**`config.clients`**:
```sql
id                STRING        -- UUID, primary key
name              STRING
meta_account_id   STRING        -- Fivetran Meta account_id (e.g. 'act_123456789')
google_customer_id STRING       -- Fivetran Google customer_id (e.g. '1234567890')
northbeam_brand_id STRING       -- nullable
triple_whale_brand_id STRING    -- nullable
target_mer        FLOAT64
target_contribution_margin_pct FLOAT64
```

### Normalized Views (analytics dataset)

See `bigquery/views.sql` for full definitions. These views normalize Fivetran's raw tables into the shape the app expects:

| View | Sources | Purpose |
|------|---------|---------|
| `analytics.v_meta_daily` | facebook_ads.basic_ad + actions + history tables + config.clients | Meta daily metrics with client_id |
| `analytics.v_google_daily` | google_ads.ad_group_stats + history tables + config.clients | Google daily metrics with client_id |
| `analytics.v_daily_metrics` | Union of v_meta_daily + v_google_daily | Unified cross-platform daily data |
| `analytics.v_creative_performance` | facebook_ads creative + ad data + config.clients | Creative-level aggregated metrics |
| `analytics.v_mer_snapshots` | attribution.triple_whale_daily (or northbeam) | Blended MER from attribution source |

---

## Field Mapping & Accuracy

### The Three Revenue Numbers

Every row in `daily_metrics` has a `revenue` field. This is **in-platform reported revenue** — what Meta or Google claims based on their pixel/tag and attribution window.

| Revenue Source | What It Is | Use It For |
|---------------|------------|------------|
| Meta `action_values` (purchase) | Meta pixel + CAPI attributed purchase value. Default: 7-day click, 1-day view. | Meta ROAS on Meta drilldown page |
| Google `conversions_value` | Google tag attributed conversion value. | Google ROAS on Google drilldown page |
| Triple Whale / Northbeam `total_revenue` | **Actual Shopify revenue** (or their attributed version) | MER tracker — the truth |

These numbers **never match** because multiple platforms claim credit for the same purchase. This is expected. The dashboard shows each platform's self-reported numbers on their drilldown pages, and the MER tracker shows the blended truth.

### Field Derivation

All ratio fields are derived. The views provide raw numbers; the app calculates ratios:

| Field | Formula | Notes |
|-------|---------|-------|
| `roas` | `revenue / spend` | In-platform ROAS |
| `cpa` | `spend / conversions` | Cost per acquisition |
| `cpm` | `(spend / impressions) * 1000` | Cost per mille |
| `ctr` | `(clicks / impressions) * 100` | Click-through rate |
| `cvr` | `(conversions / clicks) * 100` | Conversion rate |
| `aov` | `revenue / conversions` | Average order value |
| `mer` | `total_shopify_revenue / total_ad_spend` | Marketing efficiency ratio |
| `amer` | Varies by attribution model | Adjusted MER |

### Meta Field Mapping

| App Field | Fivetran Source | Notes |
|-----------|----------------|-------|
| `spend` | `basic_ad.spend` | Exact match to Ads Manager |
| `impressions` | `basic_ad.impressions` | |
| `clicks` | `basic_ad.inline_link_clicks` | Link clicks, NOT all clicks. Matches "Link Clicks" in Ads Manager |
| `conversions` | `basic_ad_actions.value` WHERE `action_type = 'offsite_conversion.fb_pixel_purchase'` | Purchase events. Default 7d click + 1d view attribution |
| `revenue` | `basic_ad_action_values.value` WHERE `action_type = 'offsite_conversion.fb_pixel_purchase'` | Purchase value. Matches "Purchase ROAS" denominator |

### Google Field Mapping

| App Field | Fivetran Source | Notes |
|-----------|----------------|-------|
| `spend` | `ad_group_stats.cost_micros / 1000000` | Micros → dollars |
| `impressions` | `ad_group_stats.impressions` | |
| `clicks` | `ad_group_stats.clicks` | All clicks |
| `conversions` | `ad_group_stats.conversions` | Configured conversion actions |
| `revenue` | `ad_group_stats.conversions_value` | Conversion value |

---

## App Architecture

### Data Layer

```
src/lib/data/
  metrics.ts          -- Public API (same function signatures for both modes)
  seed-metrics.ts     -- Seed data implementation (demo mode)
  bigquery-metrics.ts -- BigQuery implementation (production mode)
```

`metrics.ts` checks `DATA_SOURCE` env var and delegates to the appropriate implementation. All functions are async and return the same types regardless of data source.

### API Routes (BigQuery mode only)

```
src/app/api/
  clients/route.ts                GET /api/clients
  metrics/
    summary/route.ts              GET /api/metrics/summary?clientId=...&start=...&end=...
    channels/route.ts             GET /api/metrics/channels
    campaigns/route.ts            GET /api/metrics/campaigns&channel=...
    trends/route.ts               GET /api/metrics/trends
    mer/route.ts                  GET /api/metrics/mer
    creative/route.ts             GET /api/metrics/creative
    adsets/route.ts               GET /api/metrics/adsets?campaignId=...
```

API routes run server-side and query BigQuery using a service account. Client components fetch from these endpoints.

### Page Architecture

All pages are client components using `useAppContext()` for client/date selection and `useEffect` for data fetching. This stays unchanged — only the data functions' internal implementation changes.

| Page | Data Functions |
|------|---------------|
| Dashboard | `getClientSummary`, `getChannelBreakdown`, `getCampaignPerformance`, `getDailyTrends` |
| Meta | `getCampaignPerformance('meta')`, `getAdsetPerformance` (on expand) |
| Google | `getCampaignPerformance('google')`, `getAdsetPerformance` (on expand) |
| Creative | `getCreativePerformance` |
| MER | `getMERHistory`, `getClientSummary` |
| Settings | Direct seed data (will connect to Supabase or BigQuery config table later) |

---

## Environment Variables

### Required for BigQuery mode

```env
DATA_SOURCE=bigquery
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
BIGQUERY_DATASET_ANALYTICS=analytics
BIGQUERY_DATASET_CONFIG=config

# Authentication (one of these):
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json   # local dev
BIGQUERY_CREDENTIALS_JSON='{"type":"service_account",...}'          # Vercel (inline JSON)
```

### Required for demo mode (default)

```env
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
```

### Optional

```env
NEXT_PUBLIC_BASE_PATH=/lower-cross-platform    # GitHub Pages only
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Setup Guide

### 1. Fivetran

1. Create a Fivetran account and connect a BigQuery destination
2. Add a **Facebook Ads** connector → select ad accounts → set schema to `facebook_ads`
3. Add a **Google Ads** connector → select customer IDs → set schema to `google_ads`
4. Initial sync runs automatically. Ongoing syncs every 6 hours (configurable)

### 2. BigQuery

1. Run `bigquery/setup.sql` to create datasets and the clients config table
2. Insert your client rows into `config.clients` with their ad account IDs
3. Run `bigquery/views.sql` to create the normalized views
4. After first Fivetran sync completes, verify views return data

### 3. Attribution Data

For **Triple Whale**: Export daily data to `attribution.triple_whale_daily` table. Options:
- Manual CSV upload to BigQuery
- Triple Whale API → Cloud Function → BigQuery
- Triple Whale's native BigQuery integration (if available on your plan)

For **Northbeam**: Same approach into `attribution.northbeam_daily` table.

### 4. App Deployment

1. Set environment variables (see above)
2. `npm install` to get `@google-cloud/bigquery`
3. `npm run dev` to test locally
4. Deploy to Vercel with `DATA_SOURCE=bigquery` env var

### 5. GCP Service Account

1. Create a service account in your GCP project
2. Grant it `BigQuery Data Viewer` and `BigQuery Job User` roles
3. Download the JSON key for local dev, or paste the JSON as `BIGQUERY_CREDENTIALS_JSON` for Vercel

---

## Development Workflow

```bash
# Demo mode (default) — no BigQuery needed
npm run dev

# BigQuery mode — needs GCP credentials
NEXT_PUBLIC_DATA_SOURCE=bigquery npm run dev

# Build for Vercel — production (BigQuery)
NEXT_PUBLIC_DATA_SOURCE=bigquery npm run build

# Build for Vercel — demo (seed data, still server-rendered)
npm run build

# Build for GitHub Pages — static export (no API routes)
STATIC_EXPORT=true NEXT_PUBLIC_BASE_PATH=/lower-cross-platform npm run build
# Then deploy the out/ directory to gh-pages branch
```

---

## File Structure

```
lower-cross-platform/
├── ARCHITECTURE.md                    ← you are here
├── bigquery/
│   ├── setup.sql                      # Create datasets + clients table
│   └── views.sql                      # Normalized views
├── src/
│   ├── app/
│   │   ├── api/                       # API routes (BigQuery mode)
│   │   │   ├── clients/route.ts
│   │   │   └── metrics/
│   │   │       ├── summary/route.ts
│   │   │       ├── channels/route.ts
│   │   │       ├── campaigns/route.ts
│   │   │       ├── trends/route.ts
│   │   │       ├── mer/route.ts
│   │   │       ├── creative/route.ts
│   │   │       └── adsets/route.ts
│   │   ├── dashboard/page.tsx
│   │   ├── meta/page.tsx
│   │   ├── google/page.tsx
│   │   ├── creative/page.tsx
│   │   ├── mer/page.tsx
│   │   └── settings/page.tsx
│   ├── lib/
│   │   ├── bigquery/
│   │   │   ├── client.ts              # BigQuery connection
│   │   │   └── queries.ts            # Raw SQL queries
│   │   ├── data/
│   │   │   ├── metrics.ts            # Public API (routes to seed or BigQuery)
│   │   │   ├── seed-metrics.ts       # Seed data implementation
│   │   │   └── bigquery-metrics.ts   # BigQuery implementation
│   │   ├── seed.ts                    # Demo data generator
│   │   └── utils.ts
│   └── types/
│       └── database.ts
└── supabase/
    └── migrations/                    # Supabase schema (legacy, not used with BigQuery)
```
