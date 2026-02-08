"use client"

import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClientSelector } from './client-selector'
import { DateRangePicker } from './date-range-picker'
import { useAppContext } from '@/contexts/app-context'

export function Header() {
  const { 
    clients, 
    selectedClientId, 
    setSelectedClientId,
    dateRange,
    setDateRange,
  } = useAppContext()

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <div className="flex items-center gap-4">
        <ClientSelector
          clients={clients}
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-64 bg-zinc-900 border-zinc-700 pl-9"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-zinc-400" />
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
            3
          </span>
        </Button>
      </div>
    </header>
  )
}
