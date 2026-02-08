"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { MERData } from '@/lib/data/metrics'

interface MERChartProps {
  data: MERData[]
  targetMER: number
  loading?: boolean
}

export function MERChart({ data, targetMER, loading = false }: MERChartProps) {
  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">
            MER Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full bg-zinc-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    date: d.date,
    mer: d.mer,
    amer: d.amer,
    spend: d.total_spend,
    revenue: d.total_revenue,
    contributionMargin: d.contribution_margin,
  }))

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-white">
          MER Trend
        </CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-zinc-400">MER</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span className="text-zinc-400">aMER</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-emerald-500 border-dashed border border-emerald-500" />
            <span className="text-zinc-400">Target ({targetMER}x)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={{ stroke: '#27272a' }}
              />
              <YAxis
                domain={[0, 'auto']}
                tickFormatter={(value) => `${value}x`}
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={{ stroke: '#27272a' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) =>
                  format(parseISO(value as string), 'MMM d, yyyy')
                }
                formatter={(value, name) => {
                  const v = value as number
                  const n = String(name)
                  if (n === 'mer') return [`${v.toFixed(2)}x`, 'MER']
                  if (n === 'amer') return [`${v.toFixed(2)}x`, 'aMER']
                  return [formatCurrency(v), n]
                }}
              />
              <ReferenceLine
                y={targetMER}
                stroke="#22c55e"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="mer"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="amer"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#a855f7' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
