"use client"

import { cn } from '@/lib/utils'

interface FatigueIndicatorProps {
  status: 'active' | 'fatigued' | 'paused'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig = {
  active: {
    color: 'bg-emerald-500',
    label: 'Active',
    ring: 'ring-emerald-500/30',
  },
  fatigued: {
    color: 'bg-amber-500',
    label: 'Fatigued',
    ring: 'ring-amber-500/30',
  },
  paused: {
    color: 'bg-red-500',
    label: 'Paused',
    ring: 'ring-red-500/30',
  },
}

const sizeConfig = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
}

export function FatigueIndicator({
  status,
  showLabel = false,
  size = 'md',
}: FatigueIndicatorProps) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'rounded-full ring-2',
          config.color,
          config.ring,
          sizeConfig[size]
        )}
      />
      {showLabel && (
        <span className="text-sm text-zinc-400">{config.label}</span>
      )}
    </div>
  )
}
