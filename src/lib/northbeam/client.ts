/**
 * Northbeam Data Export API client.
 *
 * Auth: Authorization: Basic base64(apiKey) + Data-Client-ID header
 * Flow: POST to create export → poll GET for result → download CSV
 */

import { db } from '@/lib/db'

const BASE_URL = 'https://api.northbeam.io/v1'
const POLL_INTERVAL_MS = 2000
const MAX_WAIT_MS = 90_000

export interface NorthbeamCredentials {
  apiKey: string
  clientId: string  // Northbeam Data-Client-ID (UUID)
}

export interface NorthbeamRow {
  date?: string
  channel?: string
  platform?: string
  campaign_id?: string
  campaign_name?: string
  ad_id?: string
  ad_name?: string
  spend?: number
  attributed_revenue?: number
  new_customer_revenue?: number
  returning_customer_revenue?: number
  transactions?: number
  new_customers?: number
  returning_customers?: number
  roas?: number
  cac?: number
  cpm?: number
  ctr?: number
  [key: string]: unknown
}

/** Load Northbeam credentials from SQLite for a client */
export function getNorthbeamCredentials(appClientId: string): NorthbeamCredentials | null {
  const apiKey = db.getCredential(appClientId, 'northbeam')
  const clientId = db.getNorthbeamClientId(appClientId)
  if (!apiKey || !clientId) return null
  return { apiKey, clientId }
}

function authHeaders(creds: NorthbeamCredentials) {
  return {
    'Authorization': `Basic ${Buffer.from(creds.apiKey).toString('base64')}`,
    'Content-Type': 'application/json',
    'Data-Client-ID': creds.clientId,
  }
}

/** Create a Northbeam data export, returns export ID */
export async function createDataExport(
  creds: NorthbeamCredentials,
  params: {
    startDate: string  // YYYY-MM-DD
    endDate: string
    breakdown: 'channel' | 'campaign' | 'creative'
  }
): Promise<string> {
  // Map breakdown to Northbeam breakdowns array
  const breakdownMap: Record<string, string[]> = {
    channel: ['platform'],
    campaign: ['platform', 'campaign'],
    creative: ['platform', 'campaign', 'ad'],
  }

  const metrics = [
    'spend',
    'attributed_revenue',
    'new_customer_revenue',
    'returning_customer_revenue',
    'transactions',
    'new_customers',
    'returning_customers',
    'roas',
    'cac',
  ]

  if (params.breakdown === 'creative') {
    metrics.push('cpm', 'ctr')
  }

  const body = {
    date_range: {
      start: params.startDate,
      end: params.endDate,
    },
    metrics,
    breakdowns: breakdownMap[params.breakdown],
    attribution_options: {
      models: ['clicks_only'],
      windows: ['7d'],
      accounting_modes: ['cash_snapshot'],
    },
    granularity: 'DAILY',
  }

  const res = await fetch(`${BASE_URL}/exports/data-export`, {
    method: 'POST',
    headers: authHeaders(creds),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Northbeam export creation failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  // Northbeam returns { id: "...", status: "..." } or { export_id: "..." }
  const exportId = data.id || data.export_id
  if (!exportId) throw new Error(`No export ID in response: ${JSON.stringify(data)}`)
  return exportId
}

/** Poll until the export is ready, then return download URL or data */
export async function pollExportResult(
  creds: NorthbeamCredentials,
  exportId: string,
  maxWaitMs = MAX_WAIT_MS
): Promise<{ url?: string; rows?: NorthbeamRow[] }> {
  const deadline = Date.now() + maxWaitMs

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/exports/data-export/result/${exportId}`, {
      method: 'GET',
      headers: authHeaders(creds),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Northbeam poll failed (${res.status}): ${text}`)
    }

    const data = await res.json()

    // Check various status field names Northbeam might use
    const status = (data.status || data.export_status || '').toLowerCase()

    if (status === 'done' || status === 'complete' || status === 'completed' || status === 'ready') {
      return { url: data.url || data.download_url, rows: data.rows || data.data }
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Northbeam export failed: ${data.error || data.message || status}`)
    }

    // Still processing — wait and retry
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }

  throw new Error(`Northbeam export timed out after ${maxWaitMs / 1000}s`)
}

/** Download and parse a CSV from a URL */
export async function downloadCSV(url: string): Promise<NorthbeamRow[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download CSV (${res.status})`)
  const text = await res.text()
  return parseCSV(text)
}

/** Parse CSV text into row objects */
function parseCSV(text: string): NorthbeamRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/ /g, '_'))
  const rows: NorthbeamRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted fields with commas
    const values = parseCSVLine(line)
    if (values.length !== headers.length) continue

    const row: NorthbeamRow = {}
    for (let j = 0; j < headers.length; j++) {
      const val = values[j].replace(/^"|"$/g, '').trim()
      const num = parseFloat(val)
      row[headers[j]] = isNaN(num) ? val : num
    }
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

/** Normalize a Northbeam row to a consistent field set */
export function normalizeRow(row: NorthbeamRow) {
  return {
    date: String(row.date || row.day || ''),
    channel: String(row.platform || row.channel || '').toLowerCase(),
    campaign_id: String(row.campaign_id || row.id || ''),
    campaign_name: String(row.campaign_name || row.campaign || ''),
    ad_id: String(row.ad_id || row.ad?.toString() || ''),
    ad_name: String(row.ad_name || row.ad?.toString() || ''),
    spend: Number(row.spend || 0),
    revenue: Number(row.attributed_revenue || row.revenue || 0),
    new_customer_revenue: Number(row.new_customer_revenue || 0),
    returning_customer_revenue: Number(row.returning_customer_revenue || 0),
    transactions: Number(row.transactions || row.orders || 0),
    new_customers: Number(row.new_customers || 0),
    roas: row.roas != null ? Number(row.roas) : null,
    cac: row.cac != null ? Number(row.cac) : null,
    cpm: row.cpm != null ? Number(row.cpm) : null,
    ctr: row.ctr != null ? Number(row.ctr) : null,
  }
}
