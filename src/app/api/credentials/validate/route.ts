import { NextRequest, NextResponse } from 'next/server'

type Platform = 'northbeam' | 'triple_whale' | 'shopify'

interface ValidateRequest {
  platform: Platform
  key: string
  config?: {
    store?: string  // Shopify store URL
    northbeam_client_id?: string  // Northbeam Data-Client-ID
  }
}

async function validateNorthbeam(apiKey: string, clientId?: string): Promise<{ valid: boolean; error?: string }> {
  if (!clientId) {
    return { valid: false, error: 'Northbeam Data-Client-ID is required' }
  }

  try {
    // Test the Northbeam Data Export API — discovery endpoint
    const basicAuth = Buffer.from(apiKey).toString('base64')
    const res = await fetch('https://api.northbeam.io/v1/exports/metrics', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Data-Client-ID': clientId,
      },
    })
    if (res.ok || res.status === 200) return { valid: true }
    if (res.status === 401 || res.status === 403) {
      const body = await res.json().catch(() => ({}))
      return { valid: false, error: body.error || 'Invalid API key or Data-Client-ID' }
    }
    return { valid: false, error: `Northbeam returned status ${res.status}` }
  } catch (err) {
    return { valid: false, error: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

async function validateTripleWhale(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.triplewhale.com/api/v2/users/api-keys/me', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    })
    if (res.ok) return { valid: true }
    if (res.status === 401 || res.status === 403) return { valid: false, error: 'Invalid API key' }
    return { valid: false, error: `Triple Whale returned status ${res.status}` }
  } catch (err) {
    return { valid: false, error: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

async function validateShopify(token: string, store: string): Promise<{ valid: boolean; error?: string; shopName?: string }> {
  try {
    // Normalize store URL
    let storeHost = store.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!storeHost.includes('.')) storeHost = `${storeHost}.myshopify.com`

    const res = await fetch(`https://${storeHost}/admin/api/2025-01/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': token,
      },
    })

    if (res.ok) {
      const data = await res.json()
      return { valid: true, shopName: data.shop?.name }
    }
    if (res.status === 401 || res.status === 403) return { valid: false, error: 'Invalid access token' }
    return { valid: false, error: `Shopify returned status ${res.status}` }
  } catch (err) {
    return { valid: false, error: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ValidateRequest = await req.json()

    if (!body.platform || !body.key) {
      return NextResponse.json({ error: 'platform and key are required' }, { status: 400 })
    }

    let result: { valid: boolean; error?: string; shopName?: string }

    switch (body.platform) {
      case 'northbeam':
        result = await validateNorthbeam(body.key, body.config?.northbeam_client_id)
        break
      case 'triple_whale':
        result = await validateTripleWhale(body.key)
        break
      case 'shopify':
        if (!body.config?.store) {
          return NextResponse.json({ error: 'Shopify store URL is required' }, { status: 400 })
        }
        result = await validateShopify(body.key, body.config.store)
        break
      default:
        return NextResponse.json({ error: `Unknown platform: ${body.platform}` }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/credentials/validate error:', error)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}
