import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { demoClients } from '@/lib/seed'

export async function GET() {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      // No encryption key = demo mode
      return NextResponse.json(demoClients)
    }

    const clients = db.getClients()
    if (clients.length === 0) {
      return NextResponse.json(demoClients)
    }
    return NextResponse.json(clients)
  } catch {
    return NextResponse.json(demoClients)
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'Set ENCRYPTION_KEY to enable storage' }, { status: 503 })
    }

    const body = await req.json()
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    db.upsertClient({
      id,
      name: body.name,
      shopify_store: body.shopify_store || null,
      meta_account_id: body.meta_account_id || null,
      google_account_id: body.google_account_id || null,
      target_mer: body.target_mer ? Number(body.target_mer) : null,
      target_contribution_margin_pct: body.target_contribution_margin_pct
        ? Number(body.target_contribution_margin_pct)
        : null,
    })

    const client = db.getClient(id)
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('POST /api/clients error:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
