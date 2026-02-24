import { getBigQueryClient, DATASET_ANALYTICS, DATASET_CONFIG } from './client'

interface QueryParams {
  clientId: string
  startDate: string
  endDate: string
  channel?: string | null
  campaignId?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runQuery(sql: string, params: Record<string, string | null>): Promise<Record<string, any>[]> {
  const bq = getBigQueryClient()
  const [rows] = await bq.query({ query: sql, params })
  return rows as Record<string, any>[]
}

// ── Clients ────────────────────────────────────────────────

export async function queryClients() {
  return runQuery(
    `SELECT id, name, meta_account_id, google_customer_id,
            northbeam_brand_id, triple_whale_brand_id,
            target_mer, target_contribution_margin_pct
     FROM \`${DATASET_CONFIG}.clients\`
     ORDER BY name`,
    {}
  )
}

export async function queryClient(clientId: string) {
  const rows = await runQuery(
    `SELECT * FROM \`${DATASET_CONFIG}.clients\` WHERE id = @clientId`,
    { clientId }
  )
  return rows[0] || null
}

// ── Daily Metrics (unified) ────────────────────────────────

export async function queryDailyMetrics({ clientId, startDate, endDate, channel }: QueryParams) {
  const channelFilter = channel ? 'AND channel = @channel' : ''
  return runQuery(
    `SELECT * FROM \`${DATASET_ANALYTICS}.v_daily_metrics\`
     WHERE client_id = @clientId
       AND date BETWEEN @startDate AND @endDate
       ${channelFilter}
     ORDER BY date`,
    { clientId, startDate, endDate, channel: channel || null }
  )
}

// ── Aggregated Summary ─────────────────────────────────────

export async function querySummary({ clientId, startDate, endDate }: QueryParams) {
  const rows = await runQuery(
    `SELECT
       ROUND(SUM(spend), 2)        AS spend,
       ROUND(SUM(revenue), 2)      AS revenue,
       SUM(impressions)            AS impressions,
       SUM(clicks)                 AS clicks,
       SUM(conversions)            AS conversions
     FROM \`${DATASET_ANALYTICS}.v_daily_metrics\`
     WHERE client_id = @clientId
       AND date BETWEEN @startDate AND @endDate`,
    { clientId, startDate, endDate }
  )
  return rows[0] || { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 }
}

// ── Channel Breakdown ──────────────────────────────────────

export async function queryChannelBreakdown({ clientId, startDate, endDate }: QueryParams) {
  return runQuery(
    `SELECT
       channel,
       ROUND(SUM(spend), 2)        AS spend,
       ROUND(SUM(revenue), 2)      AS revenue,
       SUM(impressions)            AS impressions,
       SUM(clicks)                 AS clicks,
       SUM(conversions)            AS conversions
     FROM \`${DATASET_ANALYTICS}.v_daily_metrics\`
     WHERE client_id = @clientId
       AND date BETWEEN @startDate AND @endDate
     GROUP BY channel`,
    { clientId, startDate, endDate }
  )
}

// ── Campaign Performance ───────────────────────────────────

export async function queryCampaignPerformance({ clientId, startDate, endDate, channel }: QueryParams) {
  const channelFilter = channel ? 'AND channel = @channel' : ''
  return runQuery(
    `SELECT
       channel,
       campaign_id                  AS campaignId,
       campaign_name                AS campaignName,
       ROUND(SUM(spend), 2)        AS spend,
       ROUND(SUM(revenue), 2)      AS revenue,
       SUM(impressions)            AS impressions,
       SUM(clicks)                 AS clicks,
       SUM(conversions)            AS conversions
     FROM \`${DATASET_ANALYTICS}.v_daily_metrics\`
     WHERE client_id = @clientId
       AND date BETWEEN @startDate AND @endDate
       ${channelFilter}
     GROUP BY channel, campaign_id, campaign_name
     ORDER BY SUM(spend) DESC`,
    { clientId, startDate, endDate, channel: channel || null }
  )
}

// ── Adset / Ad Group Performance ───────────────────────────

export async function queryAdsetPerformance({ clientId, startDate, endDate, campaignId }: QueryParams) {
  return runQuery(
    `SELECT
       adset_id                     AS adsetId,
       adset_name                   AS adsetName,
       campaign_id                  AS campaignId,
       campaign_name                AS campaignName,
       channel,
       ROUND(SUM(spend), 2)        AS spend,
       ROUND(SUM(revenue), 2)      AS revenue,
       SUM(impressions)            AS impressions,
       SUM(clicks)                 AS clicks,
       SUM(conversions)            AS conversions
     FROM \`${DATASET_ANALYTICS}.v_daily_metrics\`
     WHERE client_id = @clientId
       AND campaign_id = @campaignId
       AND date BETWEEN @startDate AND @endDate
     GROUP BY adset_id, adset_name, campaign_id, campaign_name, channel`,
    { clientId, startDate, endDate, campaignId: campaignId || null }
  )
}

// ── Daily Trends ───────────────────────────────────────────

export async function queryDailyTrends({ clientId, startDate, endDate }: QueryParams) {
  return runQuery(
    `SELECT
       CAST(date AS STRING)        AS date,
       ROUND(SUM(spend), 2)        AS spend,
       ROUND(SUM(revenue), 2)      AS revenue,
       SUM(impressions)            AS impressions,
       SUM(clicks)                 AS clicks,
       SUM(conversions)            AS conversions
     FROM \`${DATASET_ANALYTICS}.v_daily_metrics\`
     WHERE client_id = @clientId
       AND date BETWEEN @startDate AND @endDate
     GROUP BY date
     ORDER BY date`,
    { clientId, startDate, endDate }
  )
}

// ── MER Snapshots ──────────────────────────────────────────

export async function queryMERHistory({ clientId, startDate, endDate }: QueryParams) {
  return runQuery(
    `SELECT
       client_id,
       CAST(date AS STRING)        AS date,
       total_spend,
       total_revenue,
       mer,
       amer,
       contribution_margin
     FROM \`${DATASET_ANALYTICS}.v_mer_snapshots\`
     WHERE client_id = @clientId
       AND date BETWEEN @startDate AND @endDate
     ORDER BY date`,
    { clientId, startDate, endDate }
  )
}

// ── Creative Performance ───────────────────────────────────

export async function queryCreativePerformance({ clientId }: { clientId: string }) {
  return runQuery(
    `SELECT
       client_id,
       ad_id,
       channel,
       thumbnail_url,
       creative_type,
       hook_type,
       offer_type,
       first_seen,
       last_seen,
       total_spend,
       total_revenue,
       total_impressions,
       total_clicks,
       status,
       CASE WHEN total_spend > 0 THEN ROUND(total_revenue / total_spend, 2) ELSE 0 END AS roas,
       CASE WHEN total_impressions > 0 THEN ROUND((total_clicks / total_impressions) * 100, 2) ELSE 0 END AS ctr
     FROM \`${DATASET_ANALYTICS}.v_creative_performance\`
     WHERE client_id = @clientId
     ORDER BY total_spend DESC`,
    { clientId }
  )
}
