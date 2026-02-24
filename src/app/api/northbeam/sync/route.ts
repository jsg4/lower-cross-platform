import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getNorthbeamCredentials,
  createDataExport,
  pollExportResult,
  downloadCSV,
  normalizeRow,
} from '@/lib/northbeam/client'
import { subDays, format } from 'date-fns'

/** POST /api/northbeam/sync — trigger a Northbeam data sync for a client */
export async function POST(req: NextRequest) {
  try {
    const { clientId, startDate, endDate, force = false } = await req.json()

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

    // Determine date range (default: last 60 days)
    const end = endDate || format(new Date(), 'yyyy-MM-dd')
    const start = startDate || format(subDays(new Date(), 60), 'yyyy-MM-dd')

    db.setSyncStatus(clientId, 'syncing')

    try {
      // Sync channel + campaign data
      const channelExportId = await createDataExport(creds, {
        startDate: start,
        endDate: end,
        breakdown: 'campaign',
      })

      const channelResult = await pollExportResult(creds, channelExportId)

      let channelRows: ReturnType<typeof normalizeRow>[] = []
      if (channelResult.url) {
        const raw = await downloadCSV(channelResult.url)
        channelRows = raw.map(normalizeRow)
      } else if (channelResult.rows) {
        channelRows = channelResult.rows.map(normalizeRow)
      }

      // Store channel/campaign data
      if (channelRows.length > 0) {
        db.upsertNorthbeamDaily(channelRows.map(r => ({
          client_id: clientId,
          date: r.date,
          channel: r.channel || null,
          campaign_id: r.campaign_id || null,
          campaign_name: r.campaign_name || null,
          spend: r.spend,
          revenue: r.revenue,
          new_customer_revenue: r.new_customer_revenue,
          returning_customer_revenue: r.returning_customer_revenue,
          transactions: r.transactions,
          new_customers: r.new_customers,
          roas: r.roas,
          cac: r.cac,
        })))
      }

      // Sync creative/ad level data
      const creativeExportId = await createDataExport(creds, {
        startDate: start,
        endDate: end,
        breakdown: 'creative',
      })

      const creativeResult = await pollExportResult(creds, creativeExportId)

      let creativeRows: ReturnType<typeof normalizeRow>[] = []
      if (creativeResult.url) {
        const raw = await downloadCSV(creativeResult.url)
        creativeRows = raw.map(normalizeRow)
      } else if (creativeResult.rows) {
        creativeRows = creativeResult.rows.map(normalizeRow)
      }

      // Store creative data (aggregated over the date range)
      if (creativeRows.length > 0) {
        // Group by channel + ad_id and aggregate
        const grouped = new Map<string, ReturnType<typeof normalizeRow>[]>()
        for (const r of creativeRows) {
          const key = `${r.channel}__${r.ad_id}`
          if (!grouped.has(key)) grouped.set(key, [])
          grouped.get(key)!.push(r)
        }

        const aggregated = Array.from(grouped.values()).map(rows => {
          const first = rows[0]
          const spend = rows.reduce((s, r) => s + r.spend, 0)
          const revenue = rows.reduce((s, r) => s + r.revenue, 0)
          return {
            client_id: clientId,
            date_start: start,
            date_end: end,
            channel: first.channel || null,
            campaign_name: first.campaign_name || null,
            ad_id: first.ad_id || null,
            ad_name: first.ad_name || null,
            spend,
            revenue,
            new_customer_revenue: rows.reduce((s, r) => s + r.new_customer_revenue, 0),
            transactions: rows.reduce((s, r) => s + r.transactions, 0),
            new_customers: rows.reduce((s, r) => s + r.new_customers, 0),
            roas: spend > 0 ? revenue / spend : null,
            cac: rows.reduce((s, r) => s + r.new_customers, 0) > 0
              ? spend / rows.reduce((s, r) => s + r.new_customers, 0) : null,
            cpm: rows.some(r => r.cpm != null)
              ? rows.reduce((s, r) => s + (r.cpm || 0), 0) / rows.length : null,
            ctr: rows.some(r => r.ctr != null)
              ? rows.reduce((s, r) => s + (r.ctr || 0), 0) / rows.length : null,
          }
        })

        db.upsertNorthbeamCreative(aggregated)
      }

      db.setSyncStatus(clientId, 'done')

      return NextResponse.json({
        status: 'done',
        channelRows: channelRows.length,
        creativeRows: creativeRows.length,
        dateRange: { start, end },
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
