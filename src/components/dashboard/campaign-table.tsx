"use client"

import * as React from 'react'
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
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import type { CampaignData } from '@/lib/data/metrics'

interface CampaignTableProps {
  data: CampaignData[]
  loading?: boolean
  title?: string
}

type SortKey = 'spend' | 'revenue' | 'roas' | 'cpa' | 'ctr'
type SortDirection = 'asc' | 'desc'

const channelColors: Record<string, string> = {
  meta: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  google: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

export function CampaignTable({
  data,
  loading = false,
  title = 'Campaign Performance',
}: CampaignTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('spend')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]
      const modifier = sortDirection === 'asc' ? 1 : -1
      return (aValue - bValue) * modifier
    })
  }, [data, sortKey, sortDirection])

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    )
  }

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
              <TableHead className="text-zinc-400">Campaign</TableHead>
              <TableHead className="text-zinc-400">Channel</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('spend')}
                  className="text-zinc-400 hover:text-white -mr-3"
                >
                  Spend
                  <SortIcon column="spend" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('revenue')}
                  className="text-zinc-400 hover:text-white -mr-3"
                >
                  Revenue
                  <SortIcon column="revenue" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('roas')}
                  className="text-zinc-400 hover:text-white -mr-3"
                >
                  ROAS
                  <SortIcon column="roas" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('cpa')}
                  className="text-zinc-400 hover:text-white -mr-3"
                >
                  CPA
                  <SortIcon column="cpa" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('ctr')}
                  className="text-zinc-400 hover:text-white -mr-3"
                >
                  CTR
                  <SortIcon column="ctr" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.slice(0, 10).map((campaign) => (
              <TableRow
                key={`${campaign.channel}-${campaign.campaignId}`}
                className="border-zinc-800 hover:bg-zinc-800/50"
              >
                <TableCell className="font-medium text-white max-w-[200px] truncate">
                  {campaign.campaignName}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize',
                      channelColors[campaign.channel] || 'border-zinc-500'
                    )}
                  >
                    {campaign.channel}
                  </Badge>
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
                        ? 'text-yellow-400'
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
                  {campaign.ctr.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length > 10 && (
          <div className="mt-4 text-center">
            <Button variant="ghost" className="text-zinc-400 hover:text-white">
              View all {data.length} campaigns
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
