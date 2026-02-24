/**
 * SQLite database client with AES-256-GCM encryption for credentials.
 *
 * Usage:
 *   import { db } from '@/lib/db'
 *   const clients = db.getClients()
 *   db.upsertClient({ id: '...', name: '...' })
 *   db.setCredential(clientId, 'northbeam', 'nb_key_...')
 *   const key = db.getCredential(clientId, 'northbeam')
 */

import Database from 'better-sqlite3'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'

// ── Types ────────────────────────────────────────────────────

export interface ClientRow {
  id: string
  name: string
  northbeam_client_id: string | null
  northbeam_key_encrypted: string | null
  triple_whale_key_encrypted: string | null
  shopify_token_encrypted: string | null
  shopify_store: string | null
  meta_account_id: string | null
  google_account_id: string | null
  target_mer: number | null
  target_contribution_margin_pct: number | null
  bigquery_client_id: string | null
  created_at: string
  updated_at: string
}

export type Platform = 'northbeam' | 'triple_whale' | 'shopify'

const CREDENTIAL_COLUMNS: Record<Platform, string> = {
  northbeam: 'northbeam_key_encrypted',
  triple_whale: 'triple_whale_key_encrypted',
  shopify: 'shopify_token_encrypted',
}

// ── Encryption ───────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for credential storage')
  }
  // Derive a 32-byte key from the env var using SHA-256
  return crypto.createHash('sha256').update(key).digest()
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: base64(iv + tag + encrypted)
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const data = Buffer.from(ciphertext, 'base64')
  const iv = data.subarray(0, IV_LENGTH)
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

// ── Database ─────────────────────────────────────────────────

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'db', 'lower-cross.db')
  const dbDir = path.dirname(dbPath)

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  // Initialize schema
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql')
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8')
    _db.exec(schema)
  }

  // Migrations: add columns that may not exist in older databases
  const cols = _db.pragma('table_info(clients)') as { name: string }[]
  const colNames = new Set(cols.map(c => c.name))
  if (!colNames.has('northbeam_client_id')) {
    _db.exec('ALTER TABLE clients ADD COLUMN northbeam_client_id TEXT')
  }

  return _db
}

// ── Public API ───────────────────────────────────────────────

export const db = {
  /** Get all clients (credentials stripped — never expose encrypted keys to frontend) */
  getClients() {
    const rows = getDb()
      .prepare(`
        SELECT id, name,
               northbeam_client_id,
               shopify_store AS shopify_store_url,
               meta_account_id, google_account_id,
               target_mer, target_contribution_margin_pct,
               bigquery_client_id,
               created_at, updated_at,
               CASE WHEN northbeam_key_encrypted IS NOT NULL THEN 'connected' ELSE NULL END AS northbeam_api_key,
               CASE WHEN triple_whale_key_encrypted IS NOT NULL THEN 'connected' ELSE NULL END AS triple_whale_api_key,
               CASE WHEN shopify_token_encrypted IS NOT NULL THEN 'connected' ELSE NULL END AS shopify_token
        FROM clients
        ORDER BY created_at ASC
      `)
      .all()
    return rows as any[]
  },

  /** Get a single client by ID */
  getClient(id: string) {
    return getDb()
      .prepare(`
        SELECT id, name,
               northbeam_client_id,
               shopify_store AS shopify_store_url,
               meta_account_id, google_account_id,
               target_mer, target_contribution_margin_pct,
               bigquery_client_id,
               created_at, updated_at,
               CASE WHEN northbeam_key_encrypted IS NOT NULL THEN 'connected' ELSE NULL END AS northbeam_api_key,
               CASE WHEN triple_whale_key_encrypted IS NOT NULL THEN 'connected' ELSE NULL END AS triple_whale_api_key,
               CASE WHEN shopify_token_encrypted IS NOT NULL THEN 'connected' ELSE NULL END AS shopify_token
        FROM clients
        WHERE id = ?
      `)
      .get(id) as any | undefined
  },

  /** Create or update a client (non-credential fields only) */
  upsertClient(client: {
    id: string
    name: string
    shopify_store?: string | null
    meta_account_id?: string | null
    google_account_id?: string | null
    target_mer?: number | null
    target_contribution_margin_pct?: number | null
    bigquery_client_id?: string | null
  }) {
    const stmt = getDb().prepare(`
      INSERT INTO clients (id, name, shopify_store, meta_account_id, google_account_id,
                           target_mer, target_contribution_margin_pct, bigquery_client_id)
      VALUES (@id, @name, @shopify_store, @meta_account_id, @google_account_id,
              @target_mer, @target_contribution_margin_pct, @bigquery_client_id)
      ON CONFLICT(id) DO UPDATE SET
        name = @name,
        shopify_store = @shopify_store,
        meta_account_id = @meta_account_id,
        google_account_id = @google_account_id,
        target_mer = @target_mer,
        target_contribution_margin_pct = @target_contribution_margin_pct,
        bigquery_client_id = @bigquery_client_id,
        updated_at = datetime('now')
    `)

    return stmt.run({
      id: client.id,
      name: client.name,
      shopify_store: client.shopify_store ?? null,
      meta_account_id: client.meta_account_id ?? null,
      google_account_id: client.google_account_id ?? null,
      target_mer: client.target_mer ?? 3.5,
      target_contribution_margin_pct: client.target_contribution_margin_pct ?? 35,
      bigquery_client_id: client.bigquery_client_id ?? null,
    })
  },

  /** Delete a client */
  deleteClient(id: string) {
    return getDb().prepare('DELETE FROM clients WHERE id = ?').run(id)
  },

  /** Store the Northbeam Data-Client-ID (plain text, not a secret) */
  setNorthbeamClientId(clientId: string, northbeamClientId: string | null) {
    getDb()
      .prepare(`UPDATE clients SET northbeam_client_id = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(northbeamClientId, clientId)
  },

  /** Get the Northbeam Data-Client-ID for a client */
  getNorthbeamClientId(clientId: string): string | null {
    const row = getDb()
      .prepare('SELECT northbeam_client_id FROM clients WHERE id = ?')
      .get(clientId) as { northbeam_client_id: string | null } | undefined
    return row?.northbeam_client_id ?? null
  },

  /** Store an encrypted credential for a client */
  setCredential(clientId: string, platform: Platform, plaintext: string) {
    const column = CREDENTIAL_COLUMNS[platform]
    if (!column) throw new Error(`Unknown platform: ${platform}`)

    const encrypted = encrypt(plaintext)
    getDb()
      .prepare(`UPDATE clients SET ${column} = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(encrypted, clientId)
  },

  /** Retrieve and decrypt a credential (returns null if not set) */
  getCredential(clientId: string, platform: Platform): string | null {
    const column = CREDENTIAL_COLUMNS[platform]
    if (!column) throw new Error(`Unknown platform: ${platform}`)

    const row = getDb()
      .prepare(`SELECT ${column} AS val FROM clients WHERE id = ?`)
      .get(clientId) as { val: string | null } | undefined

    if (!row?.val) return null
    return decrypt(row.val)
  },

  /** Remove a credential for a client */
  removeCredential(clientId: string, platform: Platform) {
    const column = CREDENTIAL_COLUMNS[platform]
    if (!column) throw new Error(`Unknown platform: ${platform}`)

    if (platform === 'northbeam') {
      getDb()
        .prepare(`UPDATE clients SET ${column} = NULL, northbeam_client_id = NULL, updated_at = datetime('now') WHERE id = ?`)
        .run(clientId)
    } else {
      getDb()
        .prepare(`UPDATE clients SET ${column} = NULL, updated_at = datetime('now') WHERE id = ?`)
        .run(clientId)
    }
  },

  /** Get connection status for all platforms for a client */
  getConnectionStatus(clientId: string): Record<Platform, boolean> {
    const row = getDb()
      .prepare(`
        SELECT
          CASE WHEN northbeam_key_encrypted IS NOT NULL THEN 1 ELSE 0 END AS northbeam,
          CASE WHEN triple_whale_key_encrypted IS NOT NULL THEN 1 ELSE 0 END AS triple_whale,
          CASE WHEN shopify_token_encrypted IS NOT NULL THEN 1 ELSE 0 END AS shopify
        FROM clients WHERE id = ?
      `)
      .get(clientId) as { northbeam: number; triple_whale: number; shopify: number } | undefined

    return {
      northbeam: !!row?.northbeam,
      triple_whale: !!row?.triple_whale,
      shopify: !!row?.shopify,
    }
  },
}
