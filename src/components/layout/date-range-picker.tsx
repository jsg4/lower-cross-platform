"use client"

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { dateRangePresets, type DateRange } from '@/lib/data/metrics'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const presetLabels: Record<string, string> = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  'mtd': 'Month to Date',
  'qtd': 'Quarter to Date',
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const handlePresetSelect = (presetKey: string) => {
    const preset = dateRangePresets[presetKey]
    if (preset) {
      onChange(preset())
    }
  }

  const formatDateRange = (range: DateRange) => {
    return `${format(range.start, 'MMM d')} - ${format(range.end, 'MMM d, yyyy')}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[280px] justify-between bg-zinc-900 border-zinc-700 hover:bg-zinc-800'
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <span className="text-sm">
              {value.label || formatDateRange(value)}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Presets
        </div>
        {Object.entries(presetLabels).map(([key, label]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handlePresetSelect(key)}
            className={cn(
              value.label === label && 'bg-accent'
            )}
          >
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {formatDateRange(value)}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
