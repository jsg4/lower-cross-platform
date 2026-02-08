"use client"

import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number
  change?: number
  format?: 'currency' | 'number' | 'percent' | 'decimal'
  prefix?: string
  suffix?: string
  className?: string
  loading?: boolean
}

export function KPICard({
  title,
  value,
  change,
  format = 'number',
  prefix,
  suffix,
  className,
  loading = false,
}: KPICardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percent':
        return formatPercent(val)
      case 'decimal':
        return val.toFixed(2)
      default:
        return formatNumber(val)
    }
  }

  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="h-3 w-3 text-zinc-500" />
    }
    return change > 0 ? (
      <TrendingUp className="h-3 w-3 text-emerald-500" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-500" />
    )
  }

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-zinc-500'
    return change > 0 ? 'text-emerald-500' : 'text-red-500'
  }

  if (loading) {
    return (
      <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardContent className="pt-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {prefix}
              {formatValue(value)}
              {suffix}
            </span>
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={cn('text-sm font-medium', getTrendColor())}>
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-xs text-zinc-500">vs prev period</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
