import { NextRequest, NextResponse } from 'next/server'
import { db, type Platform } from '@/lib/db'

/** GET: Return connection status for a client (no actual keys exposed) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({ northbeam: false, triple_whale: false, shopify: false })
    }

    const { id } = await params
    const status = db.getConnectionStatus(id)
    return NextResponse.json(status)
  } catch (error) {
    console.error('GET /api/clients/[id]/credentials error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}

/** PUT: Save an encrypted credential for a client */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'Set ENCRYPTION_KEY to enable credential storage' }, { status: 503 })
    }

    const { id } = await params
    const body = await req.json()

    const platform = body.platform as Platform
    if (!['northbeam', 'triple_whale', 'shopify'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    if (!body.key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    // Store encrypted credential
    db.setCredential(id, platform, body.key)

    // If Northbeam, also store the Data-Client-ID
    if (platform === 'northbeam' && body.northbeam_client_id) {
      db.setNorthbeamClientId(id, body.northbeam_client_id)
    }

    // If Shopify, also store the store URL
    if (platform === 'shopify' && body.store) {
      const client = db.getClient(id)
      if (client) {
        db.upsertClient({ ...client, shopify_store: body.store })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/clients/[id]/credentials error:', error)
    return NextResponse.json({ error: 'Failed to save credential' }, { status: 500 })
  }
}

/** DELETE: Remove a credential for a client */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({ error: 'Set ENCRYPTION_KEY to enable credential storage' }, { status: 503 })
    }

    const { id } = await params
    const { searchParams } = req.nextUrl
    const platform = searchParams.get('platform') as Platform

    if (!platform || !['northbeam', 'triple_whale', 'shopify'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    db.removeCredential(id, platform)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/clients/[id]/credentials error:', error)
    return NextResponse.json({ error: 'Failed to remove credential' }, { status: 500 })
  }
}
