"use client"

import * as React from 'react'
import { useAppContext } from '@/contexts/app-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { format, startOfMonth, subDays } from 'date-fns'
import { Palette, ArrowUpDown, ArrowUp, ArrowDown, Trophy, AlertTriangle, Search } from 'lucide-react'

type SortField = 'spend' | 'roas' | 'new_customer_pct' | 'cac'
type SortDir = 'asc' | 'desc'

interface CreativeRow {
  channel: string | null
  campaign_name: string | null
  ad_id: string | null
  ad_name: string | null
  spend: number
  revenue: number
  new_customer_revenue: number
  transactions: number
  new_customers: number
  roas: number | null
  cac: number | null
  cpm: number | null
  ctr: number | null
}

function roasColor(roas: number | null) {
  if (!roas) return 'text-zinc-500'
  if (roas >= 4) return 'text-emerald-400'
  if (roas >= 2.5) return 'text-amber-400'
  return 'text-red-400'
}

function isFatigued(row: CreativeRow) {
  return row.spend > 500 && (row.roas ?? 99) < 2
}

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ArrowUpDown className="h-3.5 w-3.5 text-zinc-600" />
  return dir === 'desc'
    ? <ArrowDown className="h-3.5 w-3.5 text-blue-400" />
    : <ArrowUp className="h-3.5 w-3.5 text-blue-400" />
}

export default function CreativePage() {
  const { selectedClientId, clients } = useAppContext()
  const [rows, setRows] = React.useState<CreativeRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [sortField, setSortField] = React.useState<SortField>('spend')
  const [sortDir, setSortDir] = React.useState<SortDir>('desc')
  const [channelFilter, setChannelFilter] = React.useState<string>('all')
  const [search, setSearch] = React.useState('')
  const [datePreset, setDatePreset] = React.useState('30d')

  const client = clients.find(c => c.id === selectedClientId)
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  const dateRange = React.useMemo(() => {
    const end = format(new Date(), 'yyyy-MM-dd')
    const start = datePreset === 'mtd'
      ? format(startOfMonth(new Date()), 'yyyy-MM-dd')
      : format(subDays(new Date(), parseInt(datePreset)), 'yyyy-MM-dd')
    return { start, end }
  }, [datePreset])

  React.useEffect(() => {
    if (!selectedClientId) return
    setLoading(true)
    fetch(`${basePath}/api/northbeam/data?clientId=${selectedClientId}&breakdown=creative&start=${dateRange.start}&end=${dateRange.end}`)
      .then(r => r.json())
      .then(json => setRows(json.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [selectedClientId, basePath, dateRange.start, dateRange.end])

  const channels = React.useMemo(() => {
    const set = new Set(rows.map(r => r.channel || 'other'))
    return ['all', ...Array.from(set)]
  }, [rows])

  const sorted = React.useMemo(() => {
    let r = rows
    if (channelFilter !== 'all') r = r.filter(x => (x.channel || 'other') === channelFilter)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(x => (x.ad_name || '').toLowerCase().includes(q) || (x.campaign_name || '').toLowerCase().includes(q))
    }
    return [...r].sort((a, b) => {
      let av = 0, bv = 0
      if (sortField === 'spend') { av = a.spend; bv = b.spend }
      else if (sortField === 'roas') { av = a.roas ?? 0; bv = b.roas ?? 0 }
      else if (sortField === 'new_customer_pct') {
        av = a.revenue > 0 ? a.new_customer_revenue / a.revenue : 0
        bv = b.revenue > 0 ? b.new_customer_revenue / b.revenue : 0
      }
      else if (sortField === 'cac') { av = a.cac ?? 999999; bv = b.cac ?? 999999 }
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }, [rows, channelFilter, search, sortField, sortDir])

  const totalSpend = sorted.reduce((s, r) => s + r.spend, 0)
  const topByRoas = [...rows].sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0)).slice(0, 3).map(r => r.ad_id)
  const fatiguedCount = sorted.filter(isFatigued).length
  const bestRoas = [...rows].sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0]?.roas

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  if (!selectedClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Select a client to view creative analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Palette className="h-6 w-6 text-purple-400" />
            Creative Analytics
          </h1>
          <p className="text-zinc-400">Ad-level performance from Northbeam attribution</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {[['7d', '7D'], ['30d', '30D'], ['mtd', 'MTD']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDatePreset(val)}
              className={`px-3 py-1 text-xs rounded-md transition ${
                datePreset === val ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-zinc-400 mb-1">Creatives tracked</div>
            <div className="text-2xl font-bold text-white">{sorted.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-zinc-400 mb-1">Total Spend</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalSpend)}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-zinc-400 mb-1">Best ROAS</div>
            <div className={`text-2xl font-bold ${roasColor(bestRoas ?? null)}`}>
              {bestRoas != null ? `${bestRoas.toFixed(2)}x` : '—'}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" /> Fatigue alerts
            </div>
            <div className={`text-2xl font-bold ${fatiguedCount > 0 ? 'text-amber-400' : 'text-white'}`}>
              {fatiguedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search ad name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-zinc-800 border-zinc-700 w-48"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {channels.map(ch => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1 text-xs rounded-full border transition capitalize ${
                channelFilter === ch
                  ? 'bg-zinc-700 border-zinc-600 text-white'
                  : 'border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Creative table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-zinc-400 text-sm">No creative data found.</p>
              <p className="text-zinc-500 text-xs mt-1">Sync Northbeam data from the Dashboard page first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium w-8">#</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Ad Name</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Channel</th>
                    <th
                      className="text-right px-4 py-3 text-xs text-zinc-400 font-medium cursor-pointer hover:text-white select-none"
                      onClick={() => toggleSort('spend')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Spend <SortIcon field="spend" current={sortField} dir={sortDir} />
                      </div>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs text-zinc-400 font-medium cursor-pointer hover:text-white select-none"
                      onClick={() => toggleSort('roas')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        ROAS <SortIcon field="roas" current={sortField} dir={sortDir} />
                      </div>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs text-zinc-400 font-medium cursor-pointer hover:text-white select-none"
                      onClick={() => toggleSort('new_customer_pct')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        New % <SortIcon field="new_customer_pct" current={sortField} dir={sortDir} />
                      </div>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs text-zinc-400 font-medium cursor-pointer hover:text-white select-none"
                      onClick={() => toggleSort('cac')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        CAC <SortIcon field="cac" current={sortField} dir={sortDir} />
                      </div>
                    </th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => {
                    const newPct = row.revenue > 0 ? (row.new_customer_revenue / row.revenue) * 100 : null
                    const fatigued = isFatigued(row)
                    const isTop = topByRoas.includes(row.ad_id)
                    return (
                      <tr key={`${row.channel}-${row.ad_id}-${i}`} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-xs text-zinc-600">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isTop && <Trophy className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />}
                            <div>
                              <div className="text-white text-xs font-medium max-w-[280px] truncate">
                                {row.ad_name || row.ad_id || 'Unknown ad'}
                              </div>
                              {row.campaign_name && (
                                <div className="text-zinc-600 text-[10px] truncate max-w-[280px]">{row.campaign_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px] capitalize bg-zinc-800 text-zinc-300">
                            {row.channel || 'other'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-300">
                          {formatCurrency(row.spend)}
                        </td>
                        <td className={`px-4 py-3 text-right text-xs font-medium ${roasColor(row.roas)}`}>
                          {row.roas != null ? `${row.roas.toFixed(2)}x` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-400">
                          {newPct != null ? `${newPct.toFixed(0)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-400">
                          {row.cac != null ? formatCurrency(row.cac) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {fatigued ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-2.5 w-2.5" /> Low ROAS
                            </span>
                          ) : isTop ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                              <Trophy className="h-2.5 w-2.5" /> Top
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
