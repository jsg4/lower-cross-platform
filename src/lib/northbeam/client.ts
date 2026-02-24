/**
 * Northbeam Data Export API client.
 *
 * Auth: Authorization: <apiKey> (raw) + Data-Client-ID header
 * Flow: POST to create export → poll GET for result → download CSV
 *
 * API quirks discovered from live testing:
 * - metrics: array of {id: string} objects, not strings
 * - breakdowns: array of {key: string, values: string[]} objects
 * - attribution_options: uses attribution_models, attribution_windows, accounting_modes
 * - attribution_windows: string numbers ("1","3","7","14","30","60","90"), NOT "7d"
 * - accounting_modes: "cash" or "accrual", NOT "cash_snapshot"
 * - No date range param — API exports data for the account's full period
 * - Poll status: "SUCCESS" (uppercase), result is array of CSV download URLs
 * - CSV columns: breakdown_platform_northbeam, campaign_name, status,
 *   accounting_mode, attribution_model, attribution_window,
 *   spend, attributed_rev, roas, cac, customers_new, etc.
 * - Multiple rows per entity (one per accounting_mode × window combo)
 */

import { db } from '@/lib/db'

const BASE_URL = 'https://api.northbeam.io/v1'
const POLL_INTERVAL_MS = 3000
const MAX_WAIT_MS = 180_000  // 3 minutes — exports take ~2-3 min

export interface NorthbeamCredentials {
  apiKey: string
  clientId: string  // Northbeam Data-Client-ID (UUID)
}

export interface NorthbeamRow {
  [key: string]: unknown
}

// All platform values available from Northbeam's breakdowns endpoint
const ALL_PLATFORMS = [
  'Facebook Ads', 'Google Ads', 'Google Shopping', 'TikTok', 'Snapchat Ads',
  'Pinterest', 'Microsoft Ads', 'LinkedIn Ads', 'Reddit', 'YouTube Ads',
  'Klaviyo', 'Organic Search', 'Organic', 'Direct Mail', 'Influencer',
  'Amazon - Ads and Organic', 'Affiliate', 'Other', 'Unattributed',
  'Instagram Organic', 'Facebook Organic', 'YouTube Organic', 'Transactional',
  'Other Email', 'Meta Shops', 'TikTok Shops',
]

/** Load Northbeam credentials from SQLite for a client */
export function getNorthbeamCredentials(appClientId: string): NorthbeamCredentials | null {
  const apiKey = db.getCredential(appClientId, 'northbeam')
  const clientId = db.getNorthbeamClientId(appClientId)
  if (!apiKey || !clientId) return null
  return { apiKey, clientId }
}

function authHeaders(creds: NorthbeamCredentials) {
  return {
    'Authorization': creds.apiKey,
    'Content-Type': 'application/json',
    'Data-Client-ID': creds.clientId,
  }
}

/** Create a Northbeam data export, returns export ID */
export async function createDataExport(
  creds: NorthbeamCredentials,
  params: {
    breakdown: 'channel' | 'campaign' | 'creative'
  }
): Promise<string> {
  // Core metrics we need
  const metrics: { id: string }[] = [
    { id: 'spend' },
    { id: 'revAttributed' },
    { id: 'revAttributedFt' },
    { id: 'revAttributedRtn' },
    { id: 'roas' },
    { id: 'cac' },
    { id: 'customersFt' },
    { id: 'customersRtn' },
    { id: 'aov' },
  ]

  if (params.breakdown === 'creative') {
    metrics.push({ id: 'cpm' }, { id: 'ctr' })
  }

  // Breakdowns: always use Platform, add campaign for campaign/creative level
  const breakdowns: { key: string; values: string[] }[] = [
    { key: 'Platform (Northbeam)', values: ALL_PLATFORMS },
  ]

  // For campaign and creative breakdowns, Northbeam returns campaign_name
  // automatically when Platform breakdown is used. The API doesn't have
  // separate "campaign" or "ad" breakdowns — those come as extra columns.

  const body = {
    metrics,
    breakdowns,
    attribution_options: {
      attribution_models: ['northbeam_custom'],   // Clicks only
      attribution_windows: ['7'],                  // 7-day window
      accounting_modes: ['cash'],                  // Cash snapshot
    },
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
  const exportId = data.id || data.data_export_id
  if (!exportId) throw new Error(`No export ID in response: ${JSON.stringify(data)}`)
  return exportId
}

/** Poll until the export is ready, then return download URLs */
export async function pollExportResult(
  creds: NorthbeamCredentials,
  exportId: string,
  maxWaitMs = MAX_WAIT_MS
): Promise<string[]> {
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
    const status = (data.status || '').toUpperCase()

    if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'DONE') {
      // result is an array of CSV download URLs
      const urls: string[] = data.result || []
      if (!urls.length) throw new Error('Export succeeded but no download URLs returned')
      return urls
    }

    if (status === 'FAILED' || status === 'ERROR') {
      throw new Error(`Northbeam export failed: ${data.error || data.message || status}`)
    }

    // Still ENQUEUED or PROCESSING — wait and retry
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

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: NorthbeamRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    if (values.length !== headers.length) continue

    const row: NorthbeamRow = {}
    for (let j = 0; j < headers.length; j++) {
      const val = values[j].replace(/^"|"$/g, '').trim()
      const num = parseFloat(val)
      row[headers[j]] = val === '' ? null : isNaN(num) ? val : num
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

/**
 * Filter rows to Accrual performance + 7-day window.
 * Northbeam returns both Accrual and Cash snapshot rows.
 * Accrual + 7d has attributed_rev and roas; Cash snapshot does not.
 */
export function filterAccrualRows(rows: NorthbeamRow[]): NorthbeamRow[] {
  return rows.filter(r => {
    const mode = String(r.accounting_mode || '').toLowerCase()
    const window = String(r.attribution_window || '')
    return mode.includes('accrual') && window === '7'
  })
}

/**
 * Normalize a Northbeam CSV row to our internal field set.
 * CSV column names from actual API: breakdown_platform_northbeam,
 * campaign_name, attributed_rev, customers_new, etc.
 */
export function normalizeRow(row: NorthbeamRow) {
  const channel = String(
    row.breakdown_platform_northbeam || row.platform || row.channel || ''
  )
  return {
    channel,
    campaign_name: String(row.campaign_name || ''),
    ad_name: String(row.ad_name || row.ad || ''),
    spend: Number(row.spend || 0),
    revenue: Number(row.attributed_rev || 0),
    new_customer_revenue: Number(row.attributed_rev_1st_time || 0),
    returning_customer_revenue: Number(row.attributed_rev_returning || 0),
    new_customers: Number(row.customers_new || 0),
    returning_customers: Number(row.customers_returning || 0),
    roas: row.roas != null ? Number(row.roas) : null,
    cac: row.cac != null ? Number(row.cac) : null,
    aov: row.aov != null ? Number(row.aov) : null,
    cpm: row.cpm != null ? Number(row.cpm) : null,
    ctr: row.ctr != null ? Number(row.ctr) : null,
  }
}
