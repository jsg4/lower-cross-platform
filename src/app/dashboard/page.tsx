"use client"

import * as React from 'react'
import { useAppContext } from '@/contexts/app-context'
import { KPICard } from '@/components/dashboard/kpi-card'
import { SpendChart } from '@/components/dashboard/spend-chart'
import { ChannelDonut } from '@/components/dashboard/channel-donut'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, startOfMonth, getDaysInMonth, getDate } from 'date-fns'
import { AlertCircle, RefreshCw, TrendingUp, Users, UserCheck } from 'lucide-react'

// ── Pacing bar component ─────────────────────────────────────

function PacingBar({
  label,
  actual,
  target,
  monthElapsedPct,
  format: fmt = 'currency',
}: {
  label: string
  actual: number
  target: number | null
  monthElapsedPct: number
  format?: 'currency' | 'number'
}) {
  if (!target) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{label}</span>
          <span>No target set</span>
        </div>
        <div className="h-2 w-full bg-zinc-800 rounded-full" />
      </div>
    )
  }

  const actualPct = Math.min((actual / target) * 100, 110)
  const expectedPct = monthElapsedPct * 100

  // Green = on track or ahead, amber = within 10% behind, red = more than 10% behind
  const variance = (actual / target) - monthElapsedPct
  const color = variance >= -0.05
    ? 'bg-emerald-500'
    : variance >= -0.15
    ? 'bg-amber-500'
    : 'bg-red-500'

  const formatVal = (v: number) =>
    fmt === 'currency'
      ? `$${v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v.toFixed(0)}`
      : v.toLocaleString()

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-medium">
          {formatVal(actual)} <span className="text-zinc-500">/ {formatVal(target)}</span>
        </span>
      </div>
      <div className="relative h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
        {/* Expected pace marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-zinc-500 z-10"
          style={{ left: `${Math.min(expectedPct, 100)}%` }}
        />
        {/* Actual progress */}
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(actualPct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>{Math.round(expectedPct)}% of month elapsed</span>
        <span>{actualPct >= 100 ? 'Target reached!' : `${Math.round(actualPct)}% of target`}</span>
      </div>
    </div>
  )
}

// ── Channel ROAS table ───────────────────────────────────────

function ChannelROASTable({ channels, loading }: {
  channels: {
    channel: string; spend: number; revenue: number;
    roas: number | null; new_customer_pct: number | null; new_customers: number;
  }[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!channels.length) {
    return <p className="text-zinc-500 text-sm">No channel data. Click Sync to load Northbeam data.</p>
  }

  const totalSpend = channels.reduce((s, c) => s + c.spend, 0)

  return (
    <div className="space-y-1">
      {channels.map((ch) => {
        const roasColor = !ch.roas ? 'text-zinc-500'
          : ch.roas >= 4 ? 'text-emerald-400'
          : ch.roas >= 2.5 ? 'text-amber-400'
          : 'text-red-400'
        return (
          <div key={ch.channel} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800">
            <div className="w-20 text-xs font-medium text-white capitalize">{ch.channel}</div>
            <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${totalSpend > 0 ? (ch.spend / totalSpend) * 100 : 0}%` }}
              />
            </div>
            <div className="w-20 text-right text-xs text-zinc-400">
              ${ch.spend >= 1000 ? (ch.spend / 1000).toFixed(1) + 'K' : ch.spend.toFixed(0)}
            </div>
            <div className={`w-16 text-right text-xs font-medium ${roasColor}`}>
              {ch.roas != null ? `${ch.roas.toFixed(2)}x` : '—'}
            </div>
            <div className="w-16 text-right text-xs text-zinc-400">
              {ch.new_customer_pct != null ? `${Math.round(ch.new_customer_pct * 100)}% new` : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Dashboard page ───────────────────────────────────────────

export default function DashboardPage() {
  const { selectedClientId, clients, isLoading: ctxLoading } = useAppContext()

  const [data, setData] = React.useState<{
    channels: any[]; daily: any[]; totals: any;
  } | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [syncStatus, setSyncStatus] = React.useState<{
    status: string; lastSyncedAt: string | null; isFresh: boolean;
  } | null>(null)
  const [syncing, setSyncing] = React.useState(false)
  const [hasNoData, setHasNoData] = React.useState(false)

  const client = clients.find(c => c.id === selectedClientId)
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  // Month pacing helpers
  const now = new Date()
  const daysInMonth = getDaysInMonth(now)
  const dayOfMonth = getDate(now)
  const monthElapsedPct = dayOfMonth / daysInMonth
  const startOfMonthStr = format(startOfMonth(now), 'yyyy-MM-dd')
  const todayStr = format(now, 'yyyy-MM-dd')

  const checkSync = React.useCallback(async (clientId: string) => {
    const res = await fetch(`${basePath}/api/northbeam/sync?clientId=${clientId}`)
    if (res.ok) {
      const s = await res.json()
      setSyncStatus(s)
      return s
    }
    return null
  }, [basePath])

  const loadData = React.useCallback(async (clientId: string) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${basePath}/api/northbeam/data?clientId=${clientId}&breakdown=channel&start=${startOfMonthStr}&end=${todayStr}`
      )
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setHasNoData(json.channels?.length === 0)
      }
    } finally {
      setLoading(false)
    }
  }, [basePath, startOfMonthStr, todayStr])

  const handleSync = React.useCallback(async () => {
    if (!selectedClientId) return
    setSyncing(true)
    try {
      const res = await fetch(`${basePath}/api/northbeam/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, force: true }),
      })
      const result = await res.json()
      if (result.error) {
        alert(`Sync failed: ${result.error}`)
      } else {
        await loadData(selectedClientId)
        await checkSync(selectedClientId)
      }
    } finally {
      setSyncing(false)
    }
  }, [selectedClientId, basePath, loadData, checkSync])

  React.useEffect(() => {
    if (!selectedClientId) return
    checkSync(selectedClientId)
    loadData(selectedClientId)
  }, [selectedClientId, checkSync, loadData])

  if (!selectedClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">No Client Selected</h2>
          <p className="mt-2 text-zinc-400">Select a client from the dropdown to view their dashboard.</p>
        </div>
      </div>
    )
  }

  const totals = data?.totals
  const channels = data?.channels || []
  const daily = (data?.daily || []).map((d: any) => ({
    date: d.date,
    spend: d.spend,
    revenue: d.revenue,
  }))

  const monthlySpendTarget = (client as any)?.monthly_spend_target ?? null
  const monthlyRevenueTarget = (client as any)?.monthly_revenue_target ?? null
  const cogsMultiplier = (client as any)?.cogs_pct ?? 0.45

  const mer = totals?.spend > 0 ? totals.revenue / totals.spend : null
  const cmDollars = totals
    ? totals.revenue * (1 - cogsMultiplier) - totals.spend
    : null
  const cmPct = totals?.revenue > 0 && cmDollars != null
    ? (cmDollars / totals.revenue) * 100
    : null
  const newCustomerPct = totals?.new_customer_pct != null ? totals.new_customer_pct * 100 : null

  const hasNorthbeamConfig = !!(client as any)?.northbeam_api_key && (client as any)?.northbeam_client_id

  // No Northbeam configured
  if (!hasNorthbeamConfig) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">Northbeam performance — MTD</p>
        </div>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-10 w-10 text-amber-400" />
            <div>
              <p className="text-white font-medium">Northbeam not configured for {client?.name}</p>
              <p className="text-zinc-400 text-sm mt-1">
                Go to Settings → select {client?.name} → enter your Northbeam Data-Client-ID and API key.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">Northbeam — Month to date ({format(startOfMonth(now), 'MMM d')} – {format(now, 'MMM d')})</p>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus?.lastSyncedAt && (
            <span className="text-xs text-zinc-500">
              Synced {new Date(syncStatus.lastSyncedAt + 'Z').toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Pacing section */}
      {(monthlySpendTarget || monthlyRevenueTarget) && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              Pacing — Day {dayOfMonth} of {daysInMonth}
              <Badge variant="secondary" className="text-xs">
                {Math.round(monthElapsedPct * 100)}% elapsed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PacingBar
              label="Ad Spend"
              actual={totals?.spend || 0}
              target={monthlySpendTarget}
              monthElapsedPct={monthElapsedPct}
              format="currency"
            />
            <PacingBar
              label="Revenue"
              actual={totals?.revenue || 0}
              target={monthlyRevenueTarget}
              monthElapsedPct={monthElapsedPct}
              format="currency"
            />
          </CardContent>
        </Card>
      )}

      {/* KPI row 1 — Performance */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Total Spend"
          value={totals?.spend || 0}
          format="currency"
          loading={loading || ctxLoading}
        />
        <KPICard
          title="Total Revenue"
          value={totals?.revenue || 0}
          format="currency"
          loading={loading || ctxLoading}
        />
        <KPICard
          title="MER"
          value={mer || 0}
          format="decimal"
          suffix="x"
          loading={loading || ctxLoading}
        />
        <KPICard
          title="Contribution Margin"
          value={cmPct || 0}
          format="percent"
          loading={loading || ctxLoading}
        />
      </div>

      {/* KPI row 2 — Customer split */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-zinc-400">New Customer Rev</span>
            </div>
            <div className="text-xl font-bold text-white">
              {totals?.new_customer_revenue
                ? `$${(totals.new_customer_revenue / 1000).toFixed(1)}K`
                : loading ? '—' : '$0'}
            </div>
            {newCustomerPct != null && (
              <div className="text-xs text-zinc-500 mt-0.5">{newCustomerPct.toFixed(0)}% of revenue</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-zinc-400">Returning Rev</span>
            </div>
            <div className="text-xl font-bold text-white">
              {totals?.returning_customer_revenue
                ? `$${(totals.returning_customer_revenue / 1000).toFixed(1)}K`
                : loading ? '—' : '$0'}
            </div>
            {newCustomerPct != null && (
              <div className="text-xs text-zinc-500 mt-0.5">{(100 - newCustomerPct).toFixed(0)}% of revenue</div>
            )}
          </CardContent>
        </Card>
        <KPICard
          title="New Customers"
          value={totals?.new_customers || 0}
          format="number"
          loading={loading || ctxLoading}
        />
        <KPICard
          title="CAC"
          value={totals?.cac || 0}
          format="currency"
          loading={loading || ctxLoading}
        />
      </div>

      {/* Charts row */}
      {daily.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SpendChart data={daily as any} loading={loading} />
          </div>
          <div>
            <ChannelDonut
              data={channels.map((c: any) => ({ channel: c.channel, spend: c.spend, roas: c.roas })) as any}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Channel ROAS table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Channel Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasNoData && !loading ? (
            <div className="text-center py-6">
              <p className="text-zinc-400 text-sm">No data yet.</p>
              <p className="text-zinc-500 text-xs mt-1">
                Click <strong>Sync</strong> to fetch data from Northbeam.
              </p>
            </div>
          ) : (
            <ChannelROASTable channels={channels} loading={loading} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
