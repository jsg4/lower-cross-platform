"use client"

import * as React from 'react'
import { useAppContext } from '@/contexts/app-context'
import { KPICard } from '@/components/dashboard/kpi-card'
import { SpendChart } from '@/components/dashboard/spend-chart'
import { ChannelDonut } from '@/components/dashboard/channel-donut'
import { CampaignTable } from '@/components/dashboard/campaign-table'
import {
  getClientSummary,
  getChannelBreakdown,
  getCampaignPerformance,
  getDailyTrends,
  type Summary,
  type ChannelData,
  type CampaignData,
  type DailyData,
} from '@/lib/data/metrics'

export default function DashboardPage() {
  const { selectedClientId, dateRange, isLoading } = useAppContext()

  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [channels, setChannels] = React.useState<ChannelData[]>([])
  const [campaigns, setCampaigns] = React.useState<CampaignData[]>([])
  const [dailyData, setDailyData] = React.useState<DailyData[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      if (!selectedClientId) return

      setLoading(true)
      try {
        const [summaryData, channelData, campaignData, trendData] = await Promise.all([
          getClientSummary(selectedClientId, dateRange),
          getChannelBreakdown(selectedClientId, dateRange),
          getCampaignPerformance(selectedClientId, null, dateRange),
          getDailyTrends(selectedClientId, dateRange),
        ])

        setSummary(summaryData)
        setChannels(channelData)
        setCampaigns(campaignData)
        setDailyData(trendData)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedClientId, dateRange])

  const currentLoading = loading || isLoading

  // Calculate MER from current data
  const currentMER = summary?.current
    ? summary.current.revenue / summary.current.spend
    : 0
  const previousMER = summary?.previous
    ? summary.previous.revenue / summary.previous.spend
    : 0
  const merChange = previousMER > 0 ? ((currentMER - previousMER) / previousMER) * 100 : 0

  if (!selectedClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">No Client Selected</h2>
          <p className="mt-2 text-zinc-400">
            Select a client from the dropdown to view their dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400">Cross-channel performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Spend"
          value={summary?.current.spend || 0}
          change={summary?.changes.spend}
          format="currency"
          loading={currentLoading}
        />
        <KPICard
          title="Total Revenue"
          value={summary?.current.revenue || 0}
          change={summary?.changes.revenue}
          format="currency"
          loading={currentLoading}
        />
        <KPICard
          title="MER"
          value={currentMER}
          change={merChange}
          format="decimal"
          suffix="x"
          loading={currentLoading}
        />
        <KPICard
          title="Blended ROAS"
          value={summary?.current.roas || 0}
          change={summary?.changes.roas}
          format="decimal"
          suffix="x"
          loading={currentLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendChart data={dailyData} loading={currentLoading} />
        </div>
        <div>
          <ChannelDonut data={channels} loading={currentLoading} />
        </div>
      </div>

      {/* Campaign Table */}
      <CampaignTable
        data={campaigns}
        loading={currentLoading}
        title="Top Campaigns by Spend"
      />
    </div>
  )
}
