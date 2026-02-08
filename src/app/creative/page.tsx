"use client"

import * as React from 'react'
import { useAppContext } from '@/contexts/app-context'
import { Card, CardContent } from '@/components/ui/card'
import { CreativeGrid } from '@/components/creative/creative-grid'
import { Palette } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getCreativePerformance, type CreativeData } from '@/lib/data/metrics'

export default function CreativePage() {
  const { selectedClientId, dateRange, isLoading } = useAppContext()

  const [creatives, setCreatives] = React.useState<CreativeData[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      if (!selectedClientId) return

      setLoading(true)
      try {
        const data = await getCreativePerformance(selectedClientId, dateRange)
        setCreatives(data)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedClientId, dateRange])

  const currentLoading = loading || isLoading

  // Calculate summary stats
  const totalSpend = creatives.reduce((sum, c) => sum + c.total_spend, 0)
  const totalRevenue = creatives.reduce((sum, c) => sum + c.total_revenue, 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const activeCount = creatives.filter((c) => c.status === 'active').length
  const fatiguedCount = creatives.filter((c) => c.status === 'fatigued').length

  if (!selectedClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">No Client Selected</h2>
          <p className="mt-2 text-zinc-400">
            Select a client from the dropdown to view creative performance.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
          <Palette className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Creative Performance</h1>
          <p className="text-zinc-400">Analyze creative assets and fatigue signals</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Total Creatives</div>
            <div className="text-2xl font-bold text-white">{creatives.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Total Spend</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalSpend)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Avg ROAS</div>
            <div className="text-2xl font-bold text-emerald-400">
              {avgRoas.toFixed(2)}x
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Active</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">{activeCount}</span>
              <span className="text-sm text-zinc-400">creatives</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Fatigued</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400">{fatiguedCount}</span>
              <span className="text-sm text-zinc-400">creatives</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Creative Grid */}
      <CreativeGrid data={creatives} loading={currentLoading} />
    </div>
  )
}
