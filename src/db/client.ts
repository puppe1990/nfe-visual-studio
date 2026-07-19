import { createClient } from '@libsql/client'
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

  return createClient({
    url,
    authToken: authToken || undefined,
  })
}

export async function migrate(client: Client): Promise<void> {
  const statements = schemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const statement of statements) {
    await client.execute(statement)
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
    migrated = true
  }
  return client
}
