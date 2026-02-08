"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MERGaugeProps {
  currentMER: number
  targetMER: number
  previousMER?: number
  loading?: boolean
}

export function MERGauge({
  currentMER,
  targetMER,
  previousMER,
  loading = false,
}: MERGaugeProps) {
  const percentOfTarget = (currentMER / targetMER) * 100
  const change = previousMER ? ((currentMER - previousMER) / previousMER) * 100 : 0

  const getStatus = () => {
    if (percentOfTarget >= 100) return 'success'
    if (percentOfTarget >= 90) return 'warning'
    return 'danger'
  }

  const status = getStatus()
  const statusColors = {
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
  }
  const statusBg = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  }

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Marketing Efficiency Ratio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8">
            <div className="h-24 w-24 rounded-full bg-zinc-800 animate-pulse" />
            <div className="mt-4 h-6 w-32 bg-zinc-800 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
          <Target className="h-5 w-5" />
          Marketing Efficiency Ratio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-4">
          {/* Large MER Display */}
          <div className="relative">
            {/* Background ring */}
            <svg className="h-48 w-48 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                strokeWidth="8"
                fill="none"
                className="stroke-zinc-800"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={cn('transition-all duration-1000', statusBg[status])}
                strokeDasharray={`${Math.min(percentOfTarget, 100) * 2.51} 251`}
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-5xl font-bold', statusColors[status])}>
                {currentMER.toFixed(2)}
              </span>
              <span className="text-sm text-zinc-400">x</span>
            </div>
          </div>

          {/* Target comparison */}
          <div className="mt-6 flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm text-zinc-400">Target</div>
              <div className="text-xl font-semibold text-white">{targetMER.toFixed(2)}x</div>
            </div>
            <div className="h-8 w-px bg-zinc-700" />
            <div className="text-center">
              <div className="text-sm text-zinc-400">vs Target</div>
              <div className={cn('text-xl font-semibold', statusColors[status])}>
                {percentOfTarget >= 100 ? '+' : ''}
                {(percentOfTarget - 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Trend indicator */}
          {previousMER && (
            <div className="mt-4 flex items-center gap-2">
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  change >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}% vs previous period
              </span>
            </div>
          )}

          {/* Traffic light indicator */}
          <div className="mt-6 flex gap-2">
            <div
              className={cn(
                'h-4 w-4 rounded-full',
                status === 'danger' ? 'bg-red-500' : 'bg-zinc-700'
              )}
            />
            <div
              className={cn(
                'h-4 w-4 rounded-full',
                status === 'warning' ? 'bg-amber-500' : 'bg-zinc-700'
              )}
            />
            <div
              className={cn(
                'h-4 w-4 rounded-full',
                status === 'success' ? 'bg-emerald-500' : 'bg-zinc-700'
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
