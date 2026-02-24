import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'Set ENCRYPTION_KEY to enable storage' }, { status: 503 })
    }

    const { id } = await params
    const body = await req.json()

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

    const updated = db.getClient(id)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/clients/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'Set ENCRYPTION_KEY to enable storage' }, { status: 503 })
    }

    const { id } = await params
    db.deleteClient(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/clients/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}
