"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { ChannelData } from '@/lib/data/metrics'

interface ChannelDonutProps {
  data: ChannelData[]
  loading?: boolean
}

const COLORS: Record<string, string> = {
  meta: '#3b82f6',
  google: '#22c55e',
  tiktok: '#000000',
  northbeam: '#a855f7',
}

const LABELS: Record<string, string> = {
  meta: 'Meta',
  google: 'Google',
  tiktok: 'TikTok',
  northbeam: 'Northbeam',
}

export function ChannelDonut({ data, loading = false }: ChannelDonutProps) {
  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">
            Spend by Channel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="h-48 w-48 rounded-full bg-zinc-800 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalSpend = data.reduce((sum, d) => sum + d.spend, 0)
  
  const chartData = data.map((d) => ({
    name: LABELS[d.channel] || d.channel,
    value: d.spend,
    percent: totalSpend > 0 ? (d.spend / totalSpend) * 100 : 0,
    color: COLORS[d.channel] || '#71717a',
    roas: d.roas,
  }))

  const renderCustomLabel = (props: {
    cx?: number
    cy?: number
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    percent?: number
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
    if (percent < 0.05) return null
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-white">
          Spend by Channel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                strokeWidth={2}
                stroke="#18181b"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                formatter={(value, name) => [
                  formatCurrency(value as number),
                  name,
                ]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value) => (
                  <span className="text-zinc-400 text-sm">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalSpend)}
            </div>
            <div className="text-sm text-zinc-400">Total Spend</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
