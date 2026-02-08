"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import { formatCurrency, formatCompact } from '@/lib/utils'
import type { DailyData } from '@/lib/data/metrics'

interface SpendChartProps {
  data: DailyData[]
  loading?: boolean
}

export function SpendChart({ data, loading = false }: SpendChartProps) {
  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">
            Spend & Revenue Trend
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
    spend: Math.round(d.spend),
    revenue: Math.round(d.revenue),
  }))

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-white">
          Spend & Revenue Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={{ stroke: '#27272a' }}
              />
              <YAxis
                tickFormatter={(value) => formatCompact(value)}
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
                labelFormatter={(value) => format(parseISO(value as string), 'MMM d, yyyy')}
                formatter={(value, name) => [
                  formatCurrency(value as number),
                  String(name).charAt(0).toUpperCase() + String(name).slice(1),
                ]}
              />
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => (
                  <span className="text-zinc-400 text-sm">
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="spend"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#spendGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
