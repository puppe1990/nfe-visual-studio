import { createClient } from "@libsql/client";
import type { Client } from "@libsql/client";

/** Local/test helper. Do not import from production server code. */
export function createFileDbClient(options: { url: string }): Client {
  return createClient({ url: options.url });
}
