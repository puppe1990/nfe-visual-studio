import { createClient } from '@libsql/client/web'
import { createClient as createNativeClient } from '@libsql/client'
import type { Client } from '@libsql/client'
import schemaSql from './schema.sql?raw'

export type LibsqlClient = Client

function resolveDatabaseUrl(explicit?: string): string | undefined {
  if (explicit) return explicit
  const filePath = process.env.DATABASE_PATH?.trim()
  if (filePath) {
    return filePath.startsWith('file:') ? filePath : `file:${filePath}`
  }
  return process.env.TURSO_DATABASE_URL ?? process.env.LIBSQL_URL
}

function isLocalSqliteUrl(url: string): boolean {
  return url.startsWith('file:') || url === ':memory:'
}

/**
 * libSQL client. `DATABASE_PATH` / `file:` uses the native SQLite client.
 * Remote `libsql://` URLs keep the HTTP web client.
 */
export function createDbClient(options?: {
  url?: string
  authToken?: string
}): Client {
  const url = resolveDatabaseUrl(options?.url)

  if (!url) {
    throw new Error(
      'DATABASE_PATH or TURSO_DATABASE_URL is not configured. Set it in the environment.',
    )
  }

  if (isLocalSqliteUrl(url)) {
    return createNativeClient({ url })
  }

  const authToken =
    options?.authToken ??
    process.env.TURSO_AUTH_TOKEN ??
    process.env.LIBSQL_AUTH_TOKEN

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
