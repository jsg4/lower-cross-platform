"use client"

import * as React from 'react'
import { useAppContext } from '@/contexts/app-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkline } from '@/components/ui/sparkline'
import { ChevronDown, ChevronRight, Facebook } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import {
  getCampaignPerformance,
  getAdsetPerformance,
  type CampaignData,
} from '@/lib/data/metrics'

interface AdsetData {
  adsetId: string | null
  adsetName: string | null
  campaignId: string | null
  campaignName: string | null
  channel: string
  spend: number
  revenue: number
  roas: number
  cpa: number
  cpm: number
  ctr: number
  cvr: number
  impressions: number
  clicks: number
  conversions: number
  aov: number
}

export default function MetaAdsPage() {
  const { selectedClientId, dateRange, isLoading } = useAppContext()

  const [campaigns, setCampaigns] = React.useState<CampaignData[]>([])
  const [expandedCampaign, setExpandedCampaign] = React.useState<string | null>(null)
  const [adsets, setAdsets] = React.useState<Record<string, AdsetData[]>>({})
  const [loading, setLoading] = React.useState(true)
  const [loadingAdsets, setLoadingAdsets] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadData() {
      if (!selectedClientId) return

      setLoading(true)
      try {
        const data = await getCampaignPerformance(selectedClientId, 'meta', dateRange)
        setCampaigns(data)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedClientId, dateRange])

  const handleExpandCampaign = async (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null)
      return
    }

    setExpandedCampaign(campaignId)

    if (!adsets[campaignId] && selectedClientId) {
      setLoadingAdsets(campaignId)
      try {
        const data = await getAdsetPerformance(selectedClientId, campaignId, dateRange)
        setAdsets((prev) => ({ ...prev, [campaignId]: data }))
      } finally {
        setLoadingAdsets(null)
      }
    }
  }

  const currentLoading = loading || isLoading

  // Generate sparkline data (mock for now)
  const generateSparkline = () => Array.from({ length: 7 }, () => Math.random() * 100)

  if (!selectedClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">No Client Selected</h2>
          <p className="mt-2 text-zinc-400">
            Select a client from the dropdown to view Meta Ads data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
          <Facebook className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Meta Ads</h1>
          <p className="text-zinc-400">Campaign performance drilldown</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Total Spend</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(campaigns.reduce((sum, c) => sum + c.spend, 0))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Total Revenue</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(campaigns.reduce((sum, c) => sum + c.revenue, 0))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Avg ROAS</div>
            <div className="text-2xl font-bold text-emerald-400">
              {(
                campaigns.reduce((sum, c) => sum + c.revenue, 0) /
                campaigns.reduce((sum, c) => sum + c.spend, 0) || 0
              ).toFixed(2)}x
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-sm text-zinc-400">Campaigns</div>
            <div className="text-2xl font-bold text-white">{campaigns.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">
            Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="w-8" />
                  <TableHead className="text-zinc-400">Campaign</TableHead>
                  <TableHead className="text-right text-zinc-400">Spend</TableHead>
                  <TableHead className="text-right text-zinc-400">Revenue</TableHead>
                  <TableHead className="text-right text-zinc-400">ROAS</TableHead>
                  <TableHead className="text-right text-zinc-400">CPA</TableHead>
                  <TableHead className="text-right text-zinc-400">CPM</TableHead>
                  <TableHead className="text-right text-zinc-400">CTR</TableHead>
                  <TableHead className="text-right text-zinc-400">CVR</TableHead>
                  <TableHead className="text-zinc-400">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <React.Fragment key={campaign.campaignId}>
                    <TableRow
                      className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                      onClick={() => handleExpandCampaign(campaign.campaignId || '')}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedCampaign === campaign.campaignId ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-white max-w-[200px] truncate">
                        {campaign.campaignName}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {formatCurrency(campaign.spend)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {formatCurrency(campaign.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'font-medium',
                            campaign.roas >= 3
                              ? 'text-emerald-400'
                              : campaign.roas >= 2
                              ? 'text-amber-400'
                              : 'text-red-400'
                          )}
                        >
                          {campaign.roas.toFixed(2)}x
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {formatCurrency(campaign.cpa)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        ${campaign.cpm.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {campaign.ctr.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {campaign.cvr.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Sparkline data={generateSparkline()} />
                      </TableCell>
                    </TableRow>

                    {/* Expanded Adsets */}
                    {expandedCampaign === campaign.campaignId && (
                      <>
                        {loadingAdsets === campaign.campaignId ? (
                          <TableRow className="border-zinc-800 bg-zinc-900/50">
                            <TableCell colSpan={10} className="py-4">
                              <div className="flex justify-center">
                                <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          adsets[campaign.campaignId || '']?.map((adset) => (
                            <TableRow
                              key={adset.adsetId}
                              className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50"
                            >
                              <TableCell />
                              <TableCell className="pl-8 text-zinc-300">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                                  {adset.adsetName}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-zinc-400">
                                {formatCurrency(adset.spend)}
                              </TableCell>
                              <TableCell className="text-right text-zinc-400">
                                {formatCurrency(adset.revenue)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={cn(
                                    'font-medium',
                                    adset.roas >= 3
                                      ? 'text-emerald-400'
                                      : adset.roas >= 2
                                      ? 'text-amber-400'
                                      : 'text-red-400'
                                  )}
                                >
                                  {adset.roas.toFixed(2)}x
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-zinc-400">
                                {formatCurrency(adset.cpa)}
                              </TableCell>
                              <TableCell className="text-right text-zinc-400">
                                ${adset.cpm.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-zinc-400">
                                {adset.ctr.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right text-zinc-400">
                                {adset.cvr.toFixed(2)}%
                              </TableCell>
                              <TableCell>
                                <Sparkline data={generateSparkline()} />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
