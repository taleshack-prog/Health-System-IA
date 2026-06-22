import { createClient } from '@clickhouse/client'

declare global {
  var __clickhouseClient: ReturnType<typeof createClient> | undefined
}

function createClickHouseClient() {
  return createClient({
    url: process.env.CLICKHOUSE_URL!,
    username: process.env.CLICKHOUSE_USER ?? 'default',
    password: process.env.CLICKHOUSE_PASSWORD ?? '',
    database: process.env.CLICKHOUSE_DATABASE ?? 'hackfarm_observability',
    clickhouse_settings: { wait_for_async_insert: 1, async_insert: 1 },
  })
}

export const clickhouseClient =
  globalThis.__clickhouseClient ?? (globalThis.__clickhouseClient = createClickHouseClient())

export async function chQuery<T>(query: string, query_params?: Record<string, unknown>): Promise<T[]> {
  const result = await clickhouseClient.query({ query, query_params, format: 'JSONEachRow' })
  return result.json<T>()
}

export async function chInsert<T extends object>(table: string, values: T[]): Promise<void> {
  await clickhouseClient.insert({ table, values, format: 'JSONEachRow' })
}
