import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getNorthbeamCredentials,
  createDataExport,
  pollExportResult,
  downloadCSV,
  filterAccrualRows,
  normalizeRow,
} from '@/lib/northbeam/client'

/** POST /api/northbeam/sync — trigger a Northbeam data sync for a client */
export async function POST(req: NextRequest) {
  try {
    const { clientId, force = false } = await req.json()

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'ENCRYPTION_KEY not set' }, { status: 503 })
    }

    // Check if cache is fresh and not forced
    if (!force && db.isNorthbeamCacheFresh(clientId)) {
      const sync = db.getSyncStatus(clientId)
      return NextResponse.json({
        status: 'cached',
        lastSyncedAt: sync?.last_synced_at,
        message: 'Cache is fresh (< 1 hour old)',
      })
    }

    // Get credentials
    const creds = getNorthbeamCredentials(clientId)
    if (!creds) {
      return NextResponse.json({
        error: 'Northbeam not configured. Add your Data-Client-ID and API key in Settings.',
      }, { status: 422 })
    }

    db.setSyncStatus(clientId, 'syncing')

    try {
      // Create export (Northbeam API doesn't support date range — returns full period)
      const exportId = await createDataExport(creds, { breakdown: 'campaign' })

      // Poll until ready (takes ~2-3 minutes)
      const urls = await pollExportResult(creds, exportId)

      // Download and parse all CSV files
      let allRows: ReturnType<typeof normalizeRow>[] = []
      for (const url of urls) {
        const rawRows = await downloadCSV(url)
        // Filter to Accrual performance + 7-day window (has revenue + ROAS data)
        const accrualRows = filterAccrualRows(rawRows)
        allRows.push(...accrualRows.map(normalizeRow))
      }

      // Filter out zero-spend rows
      const nonZeroRows = allRows.filter(r => r.spend > 0)

      // Clear stale data, then insert fresh
      db.clearNorthbeamDaily(clientId)

      const today = new Date().toISOString().split('T')[0]
      if (nonZeroRows.length > 0) {
        db.upsertNorthbeamDaily(nonZeroRows.map(r => ({
          client_id: clientId,
          date: today,
          channel: r.channel || null,
          campaign_id: null,
          campaign_name: r.campaign_name || null,
          spend: r.spend,
          revenue: r.revenue,
          new_customer_revenue: r.new_customer_revenue,
          returning_customer_revenue: r.returning_customer_revenue,
          transactions: Math.round(r.new_customers + r.returning_customers),
          new_customers: Math.round(r.new_customers),
          roas: r.roas,
          cac: r.cac,
        })))
      }

      db.setSyncStatus(clientId, 'done')

      return NextResponse.json({
        status: 'done',
        rows: nonZeroRows.length,
        totalRawRows: allRows.length,
      })

    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : 'Unknown sync error'
      db.setSyncStatus(clientId, 'error', msg)
      return NextResponse.json({ error: msg }, { status: 502 })
    }

  } catch (error) {
    console.error('POST /api/northbeam/sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

/** GET /api/northbeam/sync — check sync status */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  const sync = db.getSyncStatus(clientId)
  const isFresh = db.isNorthbeamCacheFresh(clientId)

  return NextResponse.json({
    status: sync?.sync_status || 'idle',
    lastSyncedAt: sync?.last_synced_at || null,
    isFresh,
    error: sync?.error_message || null,
  })
}
