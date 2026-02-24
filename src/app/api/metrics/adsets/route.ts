import { NextRequest, NextResponse } from 'next/server'
import { getAdsetPerformance } from '@/lib/data/bigquery-metrics'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const clientId = searchParams.get('clientId')
    const campaignId = searchParams.get('campaignId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!clientId || !campaignId || !start || !end) {
      return NextResponse.json({ error: 'Missing clientId, campaignId, start, or end' }, { status: 400 })
    }

    const data = await getAdsetPerformance(clientId, campaignId, {
      start: new Date(start),
      end: new Date(end),
      label: '',
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('API /metrics/adsets error:', error)
    return NextResponse.json({ error: 'Failed to fetch adsets' }, { status: 500 })
  }
}
