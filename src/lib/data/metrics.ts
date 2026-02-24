/**
 * Data layer — public API
 *
 * In demo mode (default): calls seed-metrics.ts directly (in-memory data).
 * In BigQuery mode: client components fetch from /api/metrics/* routes,
 * which call bigquery-metrics.ts server-side.
 *
 * All page components import from this file. The switch is transparent.
 */

import { subDays } from 'date-fns'
import * as seed from './seed-metrics'

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

const USE_BIGQUERY = process.env.NEXT_PUBLIC_DATA_SOURCE === 'bigquery'

function dateParam(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function apiFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  const res = await fetch(`${basePath}/api${path}?${qs}`)
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  return res.json()
}

// ── Public API ─────────────────────────────────────────────

export async function getClients() {
  if (USE_BIGQUERY) {
    return apiFetch<Awaited<ReturnType<typeof seed.getClients>>>('/clients', {})
  }
  return seed.getClients()
}

export async function getClient(clientId: string) {
  if (USE_BIGQUERY) {
    const clients = await getClients()
    return clients.find(c => c.id === clientId) || null
  }
  return seed.getClient(clientId)
}

export async function getClientSummary(clientId: string, dateRange: DateRange) {
  if (USE_BIGQUERY) {
    return apiFetch<Awaited<ReturnType<typeof seed.getClientSummary>>>('/metrics/summary', {
      clientId,
      start: dateParam(dateRange.start),
      end: dateParam(dateRange.end),
    })
  }
  return seed.getClientSummary(clientId, dateRange)
}

export async function getChannelBreakdown(clientId: string, dateRange: DateRange) {
  if (USE_BIGQUERY) {
    return apiFetch<Awaited<ReturnType<typeof seed.getChannelBreakdown>>>('/metrics/channels', {
      clientId,
      start: dateParam(dateRange.start),
      end: dateParam(dateRange.end),
    })
  }
  return seed.getChannelBreakdown(clientId, dateRange)
}

export async function getCampaignPerformance(clientId: string, channel: string | null, dateRange: DateRange) {
  if (USE_BIGQUERY) {
    const params: Record<string, string> = {
      clientId,
      start: dateParam(dateRange.start),
      end: dateParam(dateRange.end),
    }
    if (channel) params.channel = channel
    return apiFetch<Awaited<ReturnType<typeof seed.getCampaignPerformance>>>('/metrics/campaigns', params)
  }
  return seed.getCampaignPerformance(clientId, channel, dateRange)
}

export async function getDailyTrends(clientId: string, dateRange: DateRange) {
  if (USE_BIGQUERY) {
    return apiFetch<Awaited<ReturnType<typeof seed.getDailyTrends>>>('/metrics/trends', {
      clientId,
      start: dateParam(dateRange.start),
      end: dateParam(dateRange.end),
    })
  }
  return seed.getDailyTrends(clientId, dateRange)
}

export async function getMERHistory(clientId: string, dateRange: DateRange) {
  if (USE_BIGQUERY) {
    return apiFetch<Awaited<ReturnType<typeof seed.getMERHistory>>>('/metrics/mer', {
      clientId,
      start: dateParam(dateRange.start),
      end: dateParam(dateRange.end),
    })
  }
  return seed.getMERHistory(clientId, dateRange)
}

export async function getCreativePerformance(clientId: string, dateRange: DateRange) {
  if (USE_BIGQUERY) {
    return apiFetch<Awaited<ReturnType<typeof seed.getCreativePerformance>>>('/metrics/creative', {
      clientId,
      start: dateParam(dateRange.start),
      end: dateParam(dateRange.end),
    })
  }
  return seed.getCreativePerformance(clientId, dateRange)
}

export async function getAdsetPerformance(clientId: string, campaignId: string, dateRange: DateRange) {
  if (USE_BIGQUERY) {
    return apiFetch<Awaited<ReturnType<typeof seed.getAdsetPerformance>>>('/metrics/adsets', {
      clientId,
      campaignId,
      start: dateParam(dateRange.start),
      end: dateParam(dateRange.end),
    })
  }
  return seed.getAdsetPerformance(clientId, campaignId, dateRange)
}

// ── Exported types (unchanged) ─────────────────────────────

export type Summary = Awaited<ReturnType<typeof getClientSummary>>
export type ChannelData = Awaited<ReturnType<typeof getChannelBreakdown>>[number]
export type CampaignData = Awaited<ReturnType<typeof getCampaignPerformance>>[number]
export type DailyData = Awaited<ReturnType<typeof getDailyTrends>>[number]
export type MERData = Awaited<ReturnType<typeof getMERHistory>>[number]
export type CreativeData = Awaited<ReturnType<typeof getCreativePerformance>>[number]
