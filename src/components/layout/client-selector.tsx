"use client"

import * as React from 'react'
import { Check, ChevronsUpDown, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Client } from '@/types/database'

interface ClientSelectorProps {
  clients: Omit<Client, 'created_at' | 'updated_at'>[]
  selectedClientId: string | null
  onClientChange: (clientId: string) => void
}

export function ClientSelector({
  clients,
  selectedClientId,
  onClientChange,
}: ClientSelectorProps) {
  const selectedClient = clients.find((c) => c.id === selectedClientId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-[280px] justify-between bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-400" />
            <span className="truncate">
              {selectedClient ? selectedClient.name : 'Select client...'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        {clients.map((client) => (
          <DropdownMenuItem
            key={client.id}
            onClick={() => onClientChange(client.id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {client.name.charAt(0)}
                </span>
              </div>
              <span>{client.name}</span>
            </div>
            {client.id === selectedClientId && (
              <Check className="h-4 w-4 text-emerald-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
