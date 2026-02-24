import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, startOfMonth, subDays } from 'date-fns'

/**
 * GET /api/northbeam/data
 *
 * Query params:
 *   clientId  — required
 *   start     — YYYY-MM-DD (default: start of current month)
 *   end       — YYYY-MM-DD (default: today)
 *   breakdown — channel | campaign | creative (default: channel)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const clientId = searchParams.get('clientId')
    const breakdown = (searchParams.get('breakdown') || 'channel') as 'channel' | 'campaign' | 'creative'

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    const today = format(new Date(), 'yyyy-MM-dd')
    const defaultStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const start = searchParams.get('start') || defaultStart
    const end = searchParams.get('end') || today

    if (breakdown === 'creative') {
      const rows = db.getNorthbeamCreative(clientId, start, end)
      return NextResponse.json({ breakdown: 'creative', rows, dateRange: { start, end } })
    }

    // Channel or campaign breakdown — query northbeam_daily
    const raw = db.getNorthbeamDaily(clientId, start, end)

    if (breakdown === 'channel') {
      // Aggregate to channel level across all dates
      const byChannel = new Map<string, {
        channel: string; spend: number; revenue: number;
        new_customer_revenue: number; returning_customer_revenue: number;
        transactions: number; new_customers: number;
      }>()

      for (const row of raw) {
        const ch = row.channel || 'other'
        if (!byChannel.has(ch)) {
          byChannel.set(ch, {
            channel: ch, spend: 0, revenue: 0,
            new_customer_revenue: 0, returning_customer_revenue: 0,
            transactions: 0, new_customers: 0,
          })
        }
        const entry = byChannel.get(ch)!
        entry.spend += row.spend || 0
        entry.revenue += row.revenue || 0
        entry.new_customer_revenue += row.new_customer_revenue || 0
        entry.returning_customer_revenue += row.returning_customer_revenue || 0
        entry.transactions += row.transactions || 0
        entry.new_customers += row.new_customers || 0
      }

      const channels = Array.from(byChannel.values()).map(ch => ({
        ...ch,
        roas: ch.spend > 0 ? ch.revenue / ch.spend : null,
        cac: ch.new_customers > 0 ? ch.spend / ch.new_customers : null,
        new_customer_pct: ch.revenue > 0 ? ch.new_customer_revenue / ch.revenue : null,
      })).sort((a, b) => b.spend - a.spend)

      // Also compute daily totals for the chart
      const byDate = new Map<string, {
        date: string; spend: number; revenue: number;
        new_customer_revenue: number; returning_customer_revenue: number;
      }>()
      for (const row of raw) {
        const d = row.date
        if (!byDate.has(d)) byDate.set(d, { date: d, spend: 0, revenue: 0, new_customer_revenue: 0, returning_customer_revenue: 0 })
        const entry = byDate.get(d)!
        entry.spend += row.spend || 0
        entry.revenue += row.revenue || 0
        entry.new_customer_revenue += row.new_customer_revenue || 0
        entry.returning_customer_revenue += row.returning_customer_revenue || 0
      }
      const daily = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))

      // Totals
      const totals = channels.reduce((acc, ch) => ({
        spend: acc.spend + ch.spend,
        revenue: acc.revenue + ch.revenue,
        new_customer_revenue: acc.new_customer_revenue + ch.new_customer_revenue,
        returning_customer_revenue: acc.returning_customer_revenue + ch.returning_customer_revenue,
        transactions: acc.transactions + ch.transactions,
        new_customers: acc.new_customers + ch.new_customers,
      }), { spend: 0, revenue: 0, new_customer_revenue: 0, returning_customer_revenue: 0, transactions: 0, new_customers: 0 })

      return NextResponse.json({
        breakdown: 'channel',
        channels,
        daily,
        totals: {
          ...totals,
          mer: totals.spend > 0 ? totals.revenue / totals.spend : null,
          roas: totals.spend > 0 ? totals.revenue / totals.spend : null,
          cac: totals.new_customers > 0 ? totals.spend / totals.new_customers : null,
          new_customer_pct: totals.revenue > 0 ? totals.new_customer_revenue / totals.revenue : null,
        },
        dateRange: { start, end },
      })
    }

    // Campaign breakdown
    const byCampaign = new Map<string, {
      channel: string; campaign_id: string; campaign_name: string;
      spend: number; revenue: number; new_customer_revenue: number;
      transactions: number; new_customers: number;
    }>()

    for (const row of raw) {
      const key = `${row.channel}__${row.campaign_id}`
      if (!byCampaign.has(key)) {
        byCampaign.set(key, {
          channel: row.channel || 'other',
          campaign_id: row.campaign_id || '',
          campaign_name: row.campaign_name || row.campaign_id || 'Unknown',
          spend: 0, revenue: 0, new_customer_revenue: 0,
          transactions: 0, new_customers: 0,
        })
      }
      const entry = byCampaign.get(key)!
      entry.spend += row.spend || 0
      entry.revenue += row.revenue || 0
      entry.new_customer_revenue += row.new_customer_revenue || 0
      entry.transactions += row.transactions || 0
      entry.new_customers += row.new_customers || 0
    }

    const campaigns = Array.from(byCampaign.values()).map(c => ({
      ...c,
      roas: c.spend > 0 ? c.revenue / c.spend : null,
      cac: c.new_customers > 0 ? c.spend / c.new_customers : null,
    })).sort((a, b) => b.spend - a.spend)

    return NextResponse.json({
      breakdown: 'campaign',
      campaigns,
      dateRange: { start, end },
    })

  } catch (error) {
    console.error('GET /api/northbeam/data error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
