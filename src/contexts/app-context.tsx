"use client"

import * as React from 'react'
import { demoClients } from '@/lib/seed'
import { dateRangePresets, type DateRange } from '@/lib/data/metrics'
import type { Client } from '@/types/database'

type ClientRow = Omit<Client, 'created_at' | 'updated_at'> & {
  created_at?: string
  updated_at?: string
}

interface AppContextType {
  clients: ClientRow[]
  selectedClientId: string | null
  setSelectedClientId: (id: string | null) => void
  selectedClient: ClientRow | null
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  isLoading: boolean
  refreshClients: () => Promise<void>
}

const AppContext = React.createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = React.useState<ClientRow[]>(demoClients)
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(
    demoClients[0]?.id || null
  )
  const [dateRange, setDateRange] = React.useState<DateRange>(
    dateRangePresets['30d']()
  )
  const [isLoading, setIsLoading] = React.useState(false)

  const refreshClients = React.useCallback(async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const res = await fetch(`${basePath}/api/clients`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setClients(data)
          // If selected client no longer exists, select first
          setSelectedClientId((prev) => {
            if (!prev || !data.find((c: ClientRow) => c.id === prev)) {
              return data[0]?.id || null
            }
            return prev
          })
          return
        }
      }
    } catch {
      // API not available (e.g., static export) — keep seed data
    }
  }, [])

  React.useEffect(() => {
    refreshClients()
  }, [refreshClients])

  const selectedClient = React.useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [selectedClientId, clients]
  )

  const handleClientChange = React.useCallback((id: string | null) => {
    setSelectedClientId(id)
  }, [])

  const handleDateRangeChange = React.useCallback((range: DateRange) => {
    setDateRange(range)
  }, [])

  const value = React.useMemo(
    () => ({
      clients,
      selectedClientId,
      setSelectedClientId: handleClientChange,
      selectedClient,
      dateRange,
      setDateRange: handleDateRangeChange,
      isLoading,
      refreshClients,
    }),
    [
      clients,
      selectedClientId,
      handleClientChange,
      selectedClient,
      dateRange,
      handleDateRangeChange,
      isLoading,
      refreshClients,
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
