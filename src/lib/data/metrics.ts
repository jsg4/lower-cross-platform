import { subDays, format } from 'date-fns'
import { 
  demoClients, 
  generateDailyMetrics, 
  generateCreativeAssets, 
  generateMERSnapshots,
  aggregateDailyMetrics,
  groupByChannel,
  groupByCampaign,
  groupByDate,
} from '@/lib/seed'

export type DateRange = {
  start: Date
  end: Date
  label: string
}

export const dateRangePresets: Record<string, () => DateRange> = {
  '7d': () => ({
    start: subDays(new Date(), 7),
    end: new Date(),
    label: 'Last 7 Days',
  }),
  '30d': () => ({
    start: subDays(new Date(), 30),
    end: new Date(),
    label: 'Last 30 Days',
  }),
  'mtd': () => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now,
      label: 'Month to Date',
    }
  },
  'qtd': () => {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3)
    return {
      start: new Date(now.getFullYear(), quarter * 3, 1),
      end: now,
      label: 'Quarter to Date',
    }
  },
}

// Cache for generated data
const metricsCache = new Map<string, ReturnType<typeof generateDailyMetrics>>()
const creativeCache = new Map<string, ReturnType<typeof generateCreativeAssets>>()
const merCache = new Map<string, ReturnType<typeof generateMERSnapshots>>()

function getMetrics(clientId: string) {
  if (!metricsCache.has(clientId)) {
    metricsCache.set(clientId, generateDailyMetrics(clientId))
  }
  return metricsCache.get(clientId)!
}

function getCreatives(clientId: string) {
  if (!creativeCache.has(clientId)) {
    creativeCache.set(clientId, generateCreativeAssets(clientId))
  }
  return creativeCache.get(clientId)!
}

function getMER(clientId: string) {
  if (!merCache.has(clientId)) {
    merCache.set(clientId, generateMERSnapshots(clientId))
  }
  return merCache.get(clientId)!
}

export async function getClients() {
  return demoClients
}

export async function getClient(clientId: string) {
  return demoClients.find(c => c.id === clientId) || null
}

export async function getClientSummary(clientId: string, dateRange: DateRange) {
  const metrics = getMetrics(clientId)
  const filtered = filterByDateRange(metrics, dateRange)
  const aggregated = aggregateDailyMetrics(filtered)
  
  // Calculate previous period for comparison
  const periodLength = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
  const prevRange = {
    start: subDays(dateRange.start, periodLength),
    end: subDays(dateRange.start, 1),
  }
  const prevFiltered = filterByDateRange(metrics, prevRange)
  const prevAggregated = aggregateDailyMetrics(prevFiltered)
  
  return {
    current: aggregated,
    previous: prevAggregated,
    changes: {
      spend: calculateChange(aggregated.spend, prevAggregated.spend),
      revenue: calculateChange(aggregated.revenue, prevAggregated.revenue),
      roas: calculateChange(aggregated.roas, prevAggregated.roas),
      cpa: calculateChange(aggregated.cpa, prevAggregated.cpa),
    },
  }
}

export async function getChannelBreakdown(clientId: string, dateRange: DateRange) {
  const metrics = getMetrics(clientId)
  const filtered = filterByDateRange(metrics, dateRange)
  return groupByChannel(filtered)
}

export async function getCampaignPerformance(clientId: string, channel: string | null, dateRange: DateRange) {
  const metrics = getMetrics(clientId)
  let filtered = filterByDateRange(metrics, dateRange)
  
  if (channel) {
    filtered = filtered.filter(m => m.channel === channel)
  }
  
  return groupByCampaign(filtered)
}

export async function getDailyTrends(clientId: string, dateRange: DateRange) {
  const metrics = getMetrics(clientId)
  const filtered = filterByDateRange(metrics, dateRange)
  return groupByDate(filtered)
}

export async function getMERHistory(clientId: string, dateRange: DateRange) {
  const snapshots = getMER(clientId)
  const startStr = format(dateRange.start, 'yyyy-MM-dd')
  const endStr = format(dateRange.end, 'yyyy-MM-dd')
  
  return snapshots
    .filter(s => s.date >= startStr && s.date <= endStr)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getCreativePerformance(clientId: string, dateRange: DateRange) {
  const creatives = getCreatives(clientId)
  
  // Calculate ROAS for sorting
  return creatives
    .map(c => ({
      ...c,
      roas: c.total_spend > 0 ? c.total_revenue / c.total_spend : 0,
      ctr: c.total_impressions > 0 ? (c.total_clicks / c.total_impressions) * 100 : 0,
    }))
    .sort((a, b) => b.roas - a.roas)
}

export async function getAdsetPerformance(clientId: string, campaignId: string, dateRange: DateRange) {
  const metrics = getMetrics(clientId)
  const filtered = filterByDateRange(metrics, dateRange)
    .filter(m => m.campaign_id === campaignId)
  
  // Group by adset
  const adsets: Record<string, typeof filtered> = {}
  for (const metric of filtered) {
    const key = metric.adset_id || 'unknown'
    if (!adsets[key]) {
      adsets[key] = []
    }
    adsets[key].push(metric)
  }
  
  return Object.entries(adsets).map(([adsetId, data]) => ({
    adsetId,
    adsetName: data[0].adset_name,
    campaignId: data[0].campaign_id,
    campaignName: data[0].campaign_name,
    channel: data[0].channel,
    ...aggregateDailyMetrics(data),
  }))
}

// Helper functions
function filterByDateRange(
  metrics: ReturnType<typeof generateDailyMetrics>,
  dateRange: { start: Date; end: Date }
) {
  const startStr = format(dateRange.start, 'yyyy-MM-dd')
  const endStr = format(dateRange.end, 'yyyy-MM-dd')
  return metrics.filter(m => m.date >= startStr && m.date <= endStr)
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// Types for the aggregated data
export type Summary = Awaited<ReturnType<typeof getClientSummary>>
export type ChannelData = Awaited<ReturnType<typeof getChannelBreakdown>>[number]
export type CampaignData = Awaited<ReturnType<typeof getCampaignPerformance>>[number]
export type DailyData = Awaited<ReturnType<typeof getDailyTrends>>[number]
export type MERData = Awaited<ReturnType<typeof getMERHistory>>[number]
export type CreativeData = Awaited<ReturnType<typeof getCreativePerformance>>[number]
