import { NextRequest, NextResponse } from 'next/server'
import { getDailyTrends } from '@/lib/data/bigquery-metrics'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const clientId = searchParams.get('clientId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!clientId || !start || !end) {
      return NextResponse.json({ error: 'Missing clientId, start, or end' }, { status: 400 })
    }

    const data = await getDailyTrends(clientId, {
      start: new Date(start),
      end: new Date(end),
      label: '',
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('API /metrics/trends error:', error)
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 })
  }
}
