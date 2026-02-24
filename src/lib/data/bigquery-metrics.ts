/**
 * BigQuery implementation — used in production mode (DATA_SOURCE=bigquery)
 *
 * Client components call the functions in metrics.ts, which fetch from
 * /api/metrics/* routes. Those API routes call these functions server-side.
 */

import { format, subDays } from 'date-fns'
import {
  queryClients,
  queryClient,
  querySummary,
  queryChannelBreakdown,
  queryCampaignPerformance,
  queryAdsetPerformance,
  queryDailyTrends,
  queryMERHistory,
  queryCreativePerformance,
} from '@/lib/bigquery/queries'
import type { DateRange } from './metrics'

function formatDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function addRatios(raw: { spend?: number; revenue?: number; impressions?: number; clicks?: number; conversions?: number }) {
  const spend = raw.spend ?? 0
  const revenue = raw.revenue ?? 0
  const impressions = raw.impressions ?? 0
  const clicks = raw.clicks ?? 0
  const conversions = raw.conversions ?? 0
  return {
    spend,
    revenue,
    impressions,
    clicks,
    conversions,
    roas: spend > 0 ? revenue / spend : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cvr: clicks > 0 ? (conversions / clicks) * 100 : 0,
    aov: conversions > 0 ? revenue / conversions : 0,
  }
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export async function getClients() {
  const rows = await queryClients()
  return rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    meta_account_id: (r.meta_account_id ?? null) as string | null,
    google_account_id: (r.google_customer_id ?? null) as string | null,
    northbeam_api_key: (r.northbeam_brand_id ?? null) as string | null,
    shopify_store_url: null as string | null,
    target_mer: (r.target_mer ?? null) as number | null,
    target_contribution_margin_pct: (r.target_contribution_margin_pct ?? null) as number | null,
  }))
}

export async function getClient(clientId: string) {
  const r = await queryClient(clientId)
  if (!r) return null
  return {
    id: r.id as string,
    name: r.name as string,
    meta_account_id: (r.meta_account_id ?? null) as string | null,
    google_account_id: (r.google_customer_id ?? null) as string | null,
    northbeam_api_key: (r.northbeam_brand_id ?? null) as string | null,
    shopify_store_url: null as string | null,
    target_mer: (r.target_mer ?? null) as number | null,
    target_contribution_margin_pct: (r.target_contribution_margin_pct ?? null) as number | null,
  }
}

export async function getClientSummary(clientId: string, dateRange: DateRange) {
  const startDate = formatDate(dateRange.start)
  const endDate = formatDate(dateRange.end)

  const currentRaw = await querySummary({ clientId, startDate, endDate })
  const current = addRatios(currentRaw)

  const periodLength = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
  const prevStart = formatDate(subDays(dateRange.start, periodLength))
  const prevEnd = formatDate(subDays(dateRange.start, 1))
  const prevRaw = await querySummary({ clientId, startDate: prevStart, endDate: prevEnd })
  const previous = addRatios(prevRaw)

  return {
    current,
    previous,
    changes: {
      spend: calculateChange(current.spend, previous.spend),
      revenue: calculateChange(current.revenue, previous.revenue),
      roas: calculateChange(current.roas, previous.roas),
      cpa: calculateChange(current.cpa, previous.cpa),
    },
  }
}

export async function getChannelBreakdown(clientId: string, dateRange: DateRange) {
  const rows = await queryChannelBreakdown({
    clientId,
    startDate: formatDate(dateRange.start),
    endDate: formatDate(dateRange.end),
  })
  return rows.map(r => ({
    channel: r.channel as string,
    ...addRatios(r),
  }))
}

export async function getCampaignPerformance(clientId: string, channel: string | null, dateRange: DateRange) {
  const rows = await queryCampaignPerformance({
    clientId,
    startDate: formatDate(dateRange.start),
    endDate: formatDate(dateRange.end),
    channel,
  })
  return rows.map(r => ({
    channel: r.channel as string,
    campaignId: r.campaignId as string,
    campaignName: r.campaignName as string,
    ...addRatios(r),
  }))
}

export async function getDailyTrends(clientId: string, dateRange: DateRange) {
  const rows = await queryDailyTrends({
    clientId,
    startDate: formatDate(dateRange.start),
    endDate: formatDate(dateRange.end),
  })
  return rows.map(r => ({
    date: r.date as string,
    ...addRatios(r),
  }))
}

export async function getMERHistory(clientId: string, dateRange: DateRange) {
  return queryMERHistory({
    clientId,
    startDate: formatDate(dateRange.start),
    endDate: formatDate(dateRange.end),
  })
}

export async function getCreativePerformance(clientId: string, _dateRange: DateRange) {
  return queryCreativePerformance({ clientId })
}

export async function getAdsetPerformance(clientId: string, campaignId: string, dateRange: DateRange) {
  const rows = await queryAdsetPerformance({
    clientId,
    startDate: formatDate(dateRange.start),
    endDate: formatDate(dateRange.end),
    campaignId,
  })
  return rows.map(r => ({
    adsetId: r.adsetId as string,
    adsetName: r.adsetName as string,
    campaignId: r.campaignId as string,
    campaignName: r.campaignName as string,
    channel: r.channel as string,
    ...addRatios(r),
  }))
}
