import { NextRequest, NextResponse } from 'next/server'
import { getClientSummary } from '@/lib/data/bigquery-metrics'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const clientId = searchParams.get('clientId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!clientId || !start || !end) {
      return NextResponse.json({ error: 'Missing clientId, start, or end' }, { status: 400 })
    }

    const dateRange = {
      start: new Date(start),
      end: new Date(end),
      label: '',
    }

    const data = await getClientSummary(clientId, dateRange)
    return NextResponse.json(data)
  } catch (error) {
    console.error('API /metrics/summary error:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
