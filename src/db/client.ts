import { createClient as createNodeClient } from '@libsql/client'
import { createClient as createWebClient } from '@libsql/client/web'
import type { Client } from '@libsql/client'
import schemaSql from './schema.sql?raw'

export type LibsqlClient = Client

/**
 * Create a Turso/libSQL client.
 * - Production/dev: TURSO_DATABASE_URL (+ optional TURSO_AUTH_TOKEN)
 * - Tests: pass file: URL via options
 */
export function createDbClient(options?: {
  url?: string
  authToken?: string
}): Client {
  const url =
    options?.url ??
    process.env.TURSO_DATABASE_URL ??
    process.env.LIBSQL_URL ??
    (process.env.NODE_ENV === 'production'
      ? undefined
      : 'file:local-nfe.db')

  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL is not configured. Set it in the environment.',
    )
  }

  const authToken =
    options?.authToken ??
    process.env.TURSO_AUTH_TOKEN ??
    process.env.LIBSQL_AUTH_TOKEN

  const remote =
    import.meta.env.PROD ||
    url.startsWith('libsql://') ||
    url.startsWith('https://')
  const createClient = remote ? createWebClient : createNodeClient
  return createClient({
    url,
    authToken: authToken || undefined,
  })
}

const SCHEMA_ALTERs = [
  'ALTER TABLE invoices ADD COLUMN st_cents INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN sefaz_protocol TEXT',
  'ALTER TABLE invoices ADD COLUMN access_key TEXT',
  'ALTER TABLE invoices ADD COLUMN cancel_protocol TEXT',
  'ALTER TABLE invoices ADD COLUMN cancel_justification TEXT',
  'ALTER TABLE invoices ADD COLUMN canceled_at INTEGER',
  'ALTER TABLE companies ADD COLUMN municipal_registration TEXT',
  "ALTER TABLE companies ADD COLUMN rps_series TEXT NOT NULL DEFAULT 'A'",
  'ALTER TABLE companies ADD COLUMN next_rps_number INTEGER NOT NULL DEFAULT 1',
]

export async function migrate(client: Client): Promise<void> {
  // Strip line comments so semicolons inside comments do not break split
  const withoutComments = schemaSql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--')
      return idx >= 0 ? line.slice(0, idx) : line
    })
    .join('\n')

  const statements = withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const statement of statements) {
    await client.execute(statement)
  }

  // Idempotent upgrades for DBs created before phase 2 columns
  for (const alter of SCHEMA_ALTERs) {
    try {
      await client.execute(alter)
    } catch {
      // column already exists
    }
  }
}

let singleton: Client | null = null
let migrated = false

export function getDb(): Client {
  if (!singleton) {
    singleton = createDbClient()
  }
  return singleton
}

export async function getMigratedDb(): Promise<Client> {
  const client = getDb()
  if (!migrated) {
    await migrate(client)
    const { seedOwnerAccount } = await import('../domain/bootstrap')
    await seedOwnerAccount(client)
    migrated = true
  }
  return client
}
