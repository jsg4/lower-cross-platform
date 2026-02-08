"use client"

import * as React from 'react'
import { demoClients } from '@/lib/seed'
import { dateRangePresets, type DateRange } from '@/lib/data/metrics'
import type { Client } from '@/types/database'

interface AppContextType {
  clients: Omit<Client, 'created_at' | 'updated_at'>[]
  selectedClientId: string | null
  setSelectedClientId: (id: string | null) => void
  selectedClient: Omit<Client, 'created_at' | 'updated_at'> | null
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  isLoading: boolean
}

const AppContext = React.createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(
    demoClients[0]?.id || null
  )
  const [dateRange, setDateRange] = React.useState<DateRange>(
    dateRangePresets['30d']()
  )
  const [isLoading, setIsLoading] = React.useState(false)

  const selectedClient = React.useMemo(
    () => demoClients.find((c) => c.id === selectedClientId) || null,
    [selectedClientId]
  )

  const handleClientChange = React.useCallback((id: string | null) => {
    setIsLoading(true)
    setSelectedClientId(id)
    // Simulate loading delay
    setTimeout(() => setIsLoading(false), 300)
  }, [])

  const handleDateRangeChange = React.useCallback((range: DateRange) => {
    setIsLoading(true)
    setDateRange(range)
    // Simulate loading delay
    setTimeout(() => setIsLoading(false), 300)
  }, [])

  const value = React.useMemo(
    () => ({
      clients: demoClients,
      selectedClientId,
      setSelectedClientId: handleClientChange,
      selectedClient,
      dateRange,
      setDateRange: handleDateRangeChange,
      isLoading,
    }),
    [
      selectedClientId,
      handleClientChange,
      selectedClient,
      dateRange,
      handleDateRangeChange,
      isLoading,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = React.useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
