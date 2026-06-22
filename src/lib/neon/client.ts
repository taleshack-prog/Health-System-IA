import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL!)

export { sql }

export async function validateProjectApiKey(
  rawApiKey: string
): Promise<{ projectId: string; clickhouseProjectId: number } | null> {
  const { createHash, timingSafeEqual } = await import('crypto')
  const keyHash = createHash('sha256').update(rawApiKey).digest('hex')
  const rows = await sql(
    'SELECT id, clickhouse_project_id, api_key_hash FROM hack_tech_farm.projects WHERE api_key_hash = $1 AND is_archived = false LIMIT 1',
    [keyHash]
  )
  if (!rows.length) return null
  const stored = Buffer.from(rows[0].api_key_hash as string)
  const provided = Buffer.from(keyHash)
  if (stored.length !== provided.length) return null
  if (!timingSafeEqual(stored, provided)) return null
  return {
    projectId: rows[0].id as string,
    clickhouseProjectId: rows[0].clickhouse_project_id as number,
  }
}

export async function upsertProjectService(
  projectId: string,
  serviceName: string,
  environment = 'production'
): Promise<void> {
  await sql(
    'INSERT INTO hack_tech_farm.project_services (project_id, name, environment, last_seen_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (project_id, name, environment) DO UPDATE SET last_seen_at = NOW()',
    [projectId, serviceName, environment]
  )
}
