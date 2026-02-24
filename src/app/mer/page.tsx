"use client"

import * as React from 'react'
import { useAppContext } from '@/contexts/app-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MERGauge } from '@/components/mer/mer-gauge'
import { MERChart } from '@/components/mer/mer-chart'
import { TrendingUp, DollarSign, Percent, Calculator, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format, startOfMonth } from 'date-fns'

export default function MERPage() {
  const { selectedClientId, clients } = useAppContext()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)

  const client = clients.find(c => c.id === selectedClientId)
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  const startOfMonthStr = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  React.useEffect(() => {
    if (!selectedClientId) return
    setLoading(true)
    fetch(`${basePath}/api/northbeam/data?clientId=${selectedClientId}&breakdown=channel&start=${startOfMonthStr}&end=${todayStr}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selectedClientId, basePath, startOfMonthStr, todayStr])

  const totals = data?.totals
  const channels: any[] = data?.channels || []

  const targetMER = (client as any)?.target_mer || 3.5
  const targetCMPct = (client as any)?.target_contribution_margin_pct || 35
  const cogsPct = (client as any)?.cogs_pct ?? 0.45

  const totalRevenue = totals?.revenue || 0
  const totalSpend = totals?.spend || 0
  const currentMER = totalSpend > 0 ? totalRevenue / totalSpend : 0

  // Contribution margin: Revenue - COGS - Ad Spend
  // COGS = revenue * cogsPct
  const cogs = totalRevenue * cogsPct
  const cmDollars = totalRevenue - cogs - totalSpend
  const cmPct = totalRevenue > 0 ? (cmDollars / totalRevenue) * 100 : 0

  // aMER = New Customer Revenue / Total Spend
  const newCustomerRevenue = totals?.new_customer_revenue || 0
  const aMER = totalSpend > 0 ? newCustomerRevenue / totalSpend : 0

  if (!selectedClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">No Client Selected</h2>
          <p className="mt-2 text-zinc-400">Select a client from the dropdown.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
          <Calculator className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Contribution Margin & MER</h1>
          <p className="text-zinc-400">P&L truth — Month to date from Northbeam</p>
        </div>
      </div>

      {/* MER gauge + summary cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MERGauge
          currentMER={currentMER}
          targetMER={targetMER}
          previousMER={0}
          loading={loading}
        />

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-red-400" />
                <span className="text-xs text-zinc-400">Ad Spend</span>
              </div>
              {loading ? <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" /> :
                <div className="text-2xl font-bold text-white">{formatCurrency(totalSpend)}</div>}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-zinc-400">Revenue</span>
              </div>
              {loading ? <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" /> :
                <div className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</div>}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-zinc-400">aMER (New Cust Rev / Spend)</span>
              </div>
              {loading ? <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" /> :
                <div className={`text-2xl font-bold ${aMER >= targetMER ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {aMER > 0 ? `${aMER.toFixed(2)}x` : '—'}
                </div>}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-zinc-400">Contribution Margin</span>
              </div>
              {loading ? <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" /> :
                <div className={`text-2xl font-bold ${cmPct >= targetCMPct ? 'text-emerald-400' : cmPct > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {cmPct.toFixed(1)}%
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CM breakdown stack */}
      {!loading && totalRevenue > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-300">Contribution Margin Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Revenue', value: totalRevenue, color: 'text-emerald-400', sign: '' },
                { label: `COGS (${(cogsPct * 100).toFixed(0)}%)`, value: -cogs, color: 'text-red-400', sign: '−' },
                { label: 'Ad Spend', value: -totalSpend, color: 'text-red-400', sign: '−' },
              ].map(({ label, value, color, sign }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-sm text-zinc-400">{sign} {label}</span>
                  <span className={`text-sm font-medium ${color}`}>{formatCurrency(Math.abs(value))}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 bg-zinc-800 px-3 rounded-lg">
                <span className="text-sm font-medium text-white">= Contribution Margin</span>
                <div className="text-right">
                  <span className={`text-lg font-bold ${cmDollars >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(cmDollars)}
                  </span>
                  <span className="text-xs text-zinc-500 ml-2">({cmPct.toFixed(1)}%)</span>
                  {targetCMPct > 0 && (
                    <div className="text-[10px] text-zinc-500">target: {targetCMPct}%</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel CM breakdown */}
      {channels.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-300">Channel Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {channels.map((ch: any) => {
                const chCM = ch.revenue * (1 - cogsPct) - ch.spend
                const chCMPct = ch.revenue > 0 ? (chCM / ch.revenue) * 100 : 0
                return (
                  <div key={ch.channel} className="grid grid-cols-5 gap-2 items-center py-2 border-b border-zinc-800/50 text-xs">
                    <span className="text-white capitalize font-medium">{ch.channel}</span>
                    <span className="text-zinc-400 text-right">{formatCurrency(ch.spend)}</span>
                    <span className="text-zinc-400 text-right">{formatCurrency(ch.revenue)}</span>
                    <span className={`text-right font-medium ${ch.roas >= targetMER ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {ch.roas?.toFixed(2) ?? '—'}x
                    </span>
                    <span className={`text-right font-medium ${chCMPct >= targetCMPct ? 'text-emerald-400' : chCMPct > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                      CM: {chCMPct.toFixed(0)}%
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-5 gap-2 text-[10px] text-zinc-600 mt-1">
              <span>Channel</span><span className="text-right">Spend</span><span className="text-right">Revenue</span><span className="text-right">ROAS</span><span className="text-right">CM%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !totals && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-8 text-center">
            <p className="text-zinc-400 text-sm">No data yet. Sync Northbeam from the Dashboard to see contribution margin.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
