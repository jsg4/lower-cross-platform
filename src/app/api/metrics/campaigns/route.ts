import { NextRequest, NextResponse } from 'next/server'
import { getCampaignPerformance } from '@/lib/data/bigquery-metrics'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const clientId = searchParams.get('clientId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const channel = searchParams.get('channel')

    if (!clientId || !start || !end) {
      return NextResponse.json({ error: 'Missing clientId, start, or end' }, { status: 400 })
    }

    const data = await getCampaignPerformance(clientId, channel, {
      start: new Date(start),
      end: new Date(end),
      label: '',
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('API /metrics/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}
