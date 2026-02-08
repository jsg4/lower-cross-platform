"use client"

import * as React from 'react'
import { useAppContext } from '@/contexts/app-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MERGauge } from '@/components/mer/mer-gauge'
import { MERChart } from '@/components/mer/mer-chart'
import { TrendingUp, DollarSign, Percent, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getMERHistory, getClientSummary, type MERData, type Summary } from '@/lib/data/metrics'
import { demoClients } from '@/lib/seed'

export default function MERPage() {
  const { selectedClientId, dateRange, isLoading } = useAppContext()

  const [merHistory, setMerHistory] = React.useState<MERData[]>([])
  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [contributionMarginPct, setContributionMarginPct] = React.useState(35)

  const selectedClient = demoClients.find((c) => c.id === selectedClientId)

  React.useEffect(() => {
    async function loadData() {
      if (!selectedClientId) return

      setLoading(true)
      try {
        const [merData, summaryData] = await Promise.all([
          getMERHistory(selectedClientId, dateRange),
          getClientSummary(selectedClientId, dateRange),
        ])
        setMerHistory(merData)
        setSummary(summaryData)

        // Set contribution margin from client settings
        if (selectedClient?.target_contribution_margin_pct) {
          setContributionMarginPct(selectedClient.target_contribution_margin_pct)
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedClientId, dateRange, selectedClient])

  const currentLoading = loading || isLoading

  // Calculate current MER
  const currentMER = summary?.current
    ? summary.current.revenue / summary.current.spend
    : 0
  const previousMER = summary?.previous
    ? summary.previous.revenue / summary.previous.spend
    : 0
  const targetMER = selectedClient?.target_mer || 3.5

  // Calculate contribution margin
  const totalRevenue = summary?.current.revenue || 0
  const totalSpend = summary?.current.spend || 0
  const contributionMargin = (totalRevenue * (contributionMarginPct / 100)) - totalSpend

  // Channel breakdown from MER data
  const latestMER = merHistory[merHistory.length - 1]

  if (!selectedClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">No Client Selected</h2>
          <p className="mt-2 text-zinc-400">
            Select a client from the dropdown to view MER data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
          <TrendingUp className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">MER & Efficiency Tracker</h1>
          <p className="text-zinc-400">Marketing efficiency ratio and contribution margin analysis</p>
        </div>
      </div>

      {/* Top row: MER Gauge + Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MERGauge
          currentMER={currentMER}
          targetMER={targetMER}
          previousMER={previousMER}
          loading={currentLoading}
        />

        {/* Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                  <DollarSign className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <div className="text-sm text-zinc-400">Total Ad Spend</div>
                  <div className="text-2xl font-bold text-white">
                    {currentLoading ? (
                      <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                    ) : (
                      formatCurrency(totalSpend)
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm text-zinc-400">Total Revenue</div>
                  <div className="text-2xl font-bold text-white">
                    {currentLoading ? (
                      <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                    ) : (
                      formatCurrency(totalRevenue)
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <Percent className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm text-zinc-400">aMER (Adjusted)</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {currentLoading ? (
                      <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
                    ) : (
                      `${(currentMER * 0.85).toFixed(2)}x`
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <Calculator className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm text-zinc-400">Contribution Margin</div>
                  <div className={`text-2xl font-bold ${contributionMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {currentLoading ? (
                      <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                    ) : (
                      formatCurrency(contributionMargin)
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MER Chart */}
      <MERChart data={merHistory} targetMER={targetMER} loading={currentLoading} />

      {/* Contribution Margin Calculator */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Contribution Margin Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="revenue">Total Revenue</Label>
              <Input
                id="revenue"
                value={formatCurrency(totalRevenue)}
                disabled
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin">Contribution Margin %</Label>
              <Input
                id="margin"
                type="number"
                min={0}
                max={100}
                value={contributionMarginPct}
                onChange={(e) => setContributionMarginPct(Number(e.target.value))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spend">Ad Spend</Label>
              <Input
                id="spend"
                value={formatCurrency(totalSpend)}
                disabled
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
            <div className="text-sm text-zinc-400">Formula: (Revenue × Margin%) − Ad Spend = Contribution $</div>
            <div className="mt-2 text-lg">
              ({formatCurrency(totalRevenue)} × {contributionMarginPct}%) − {formatCurrency(totalSpend)} ={' '}
              <span className={`font-bold ${contributionMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(contributionMargin)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MER by Channel (if we had channel data) */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">
            MER Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Meta</span>
                <span className="text-lg font-bold text-blue-400">
                  {(currentMER * 0.95).toFixed(2)}x
                </span>
              </div>
              <div className="mt-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${Math.min((currentMER * 0.95 / targetMER) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Google</span>
                <span className="text-lg font-bold text-emerald-400">
                  {(currentMER * 1.1).toFixed(2)}x
                </span>
              </div>
              <div className="mt-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min((currentMER * 1.1 / targetMER) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Blended</span>
                <span className="text-lg font-bold text-purple-400">
                  {currentMER.toFixed(2)}x
                </span>
              </div>
              <div className="mt-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${Math.min((currentMER / targetMER) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
