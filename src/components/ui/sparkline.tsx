"use client"

import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#3b82f6',
  className,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className={cn('bg-zinc-800 rounded', className)} style={{ width, height }} />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const trend = data[data.length - 1] > data[0] ? 'up' : data[data.length - 1] < data[0] ? 'down' : 'flat'
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : color

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
    >
      <polyline
        fill="none"
        stroke={trendColor}
        strokeWidth="1.5"
        points={points}
      />
      {/* End dot */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="2"
        fill={trendColor}
      />
    </svg>
  )
}
