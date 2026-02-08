"use client"

import * as React from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FatigueIndicator } from './fatigue-indicator'
import { cn, formatCurrency, formatCompact } from '@/lib/utils'
import { ChevronDown, ChevronUp, Eye, MousePointer, DollarSign, TrendingUp } from 'lucide-react'
import type { CreativeData } from '@/lib/data/metrics'

interface CreativeGridProps {
  data: CreativeData[]
  loading?: boolean
}

type SortKey = 'roas' | 'total_spend' | 'ctr'
type FilterType = 'all' | 'ugc' | 'static' | 'video' | 'carousel'

const typeColors: Record<string, string> = {
  ugc: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  static: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  video: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  carousel: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

export function CreativeGrid({ data, loading = false }: CreativeGridProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('roas')
  const [sortDesc, setSortDesc] = React.useState(true)
  const [filter, setFilter] = React.useState<FilterType>('all')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const filteredAndSorted = React.useMemo(() => {
    let result = [...data]
    
    if (filter !== 'all') {
      result = result.filter((c) => c.creative_type === filter)
    }
    
    result.sort((a, b) => {
      const aValue = a[sortKey] ?? 0
      const bValue = b[sortKey] ?? 0
      return sortDesc ? bValue - aValue : aValue - bValue
    })
    
    return result
  }, [data, filter, sortKey, sortDesc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(['all', 'ugc', 'static', 'video', 'carousel'] as const).map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(type)}
              className={cn(
                'capitalize',
                filter === type && 'bg-zinc-700'
              )}
            >
              {type === 'all' ? 'All' : type.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="text-sm text-zinc-400 self-center">Sort by:</span>
          {(['roas', 'total_spend', 'ctr'] as const).map((key) => (
            <Button
              key={key}
              variant={sortKey === key ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleSort(key)}
              className={cn(sortKey === key && 'bg-zinc-700')}
            >
              {key === 'roas' ? 'ROAS' : key === 'total_spend' ? 'Spend' : 'CTR'}
              {sortKey === key && (sortDesc ? <ChevronDown className="ml-1 h-4 w-4" /> : <ChevronUp className="ml-1 h-4 w-4" />)}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSorted.map((creative) => (
          <Card
            key={creative.ad_id}
            className={cn(
              'bg-zinc-900 border-zinc-800 overflow-hidden transition-all cursor-pointer',
              expandedId === creative.ad_id && 'ring-2 ring-blue-500'
            )}
            onClick={() => setExpandedId(expandedId === creative.ad_id ? null : creative.ad_id)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-square bg-zinc-800">
              <Image
                src={creative.thumbnail_url || '/placeholder.png'}
                alt={creative.ad_id}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute top-2 left-2 flex gap-2">
                {creative.creative_type && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'uppercase text-xs',
                      typeColors[creative.creative_type] || 'border-zinc-500'
                    )}
                  >
                    {creative.creative_type}
                  </Badge>
                )}
              </div>
              <div className="absolute top-2 right-2">
                <FatigueIndicator status={creative.status as 'active' | 'fatigued' | 'paused'} size="lg" />
              </div>
              {/* ROAS overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-2xl font-bold',
                      creative.roas >= 3
                        ? 'text-emerald-400'
                        : creative.roas >= 2
                        ? 'text-amber-400'
                        : 'text-red-400'
                    )}
                  >
                    {creative.roas.toFixed(2)}x
                  </span>
                  <span className="text-sm text-zinc-300">ROAS</span>
                </div>
              </div>
            </div>

            <CardContent className="p-4">
              {/* Basic metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-zinc-500" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(creative.total_spend)}
                    </div>
                    <div className="text-xs text-zinc-500">Spend</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-zinc-500" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(creative.total_revenue)}
                    </div>
                    <div className="text-xs text-zinc-500">Revenue</div>
                  </div>
                </div>
              </div>

              {/* Expanded metrics */}
              {expandedId === creative.ad_id && (
                <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-zinc-500" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {formatCompact(creative.total_impressions)}
                      </div>
                      <div className="text-xs text-zinc-500">Impressions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-zinc-500" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {creative.ctr.toFixed(2)}%
                      </div>
                      <div className="text-xs text-zinc-500">CTR</div>
                    </div>
                  </div>
                  {creative.hook_type && (
                    <div className="col-span-2">
                      <div className="text-xs text-zinc-500">Hook Type</div>
                      <div className="text-sm text-white capitalize">
                        {creative.hook_type.replace('-', ' ')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
