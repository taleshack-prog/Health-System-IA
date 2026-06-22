import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/neon/client'
import { createHash, randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: { message: 'Nao autenticado' } }, { status: 401 })
    const { name } = await req.json()
    if (!name) return NextResponse.json({ error: { message: 'Nome obrigatorio' } }, { status: 400 })
    const orgId = (session.user as any).organizationId
    if (!orgId) return NextResponse.json({ error: { message: 'Faca login novamente' } }, { status: 400 })
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
    const apiKey = 'hf_' + randomBytes(32).toString('hex')
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex')
    const countRows = await sql('SELECT COUNT(*) as c FROM hack_tech_farm.projects')
    const clickhouseId = Number(countRows[0].c) + 1
    const rows = await sql(
      'INSERT INTO hack_tech_farm.projects (organization_id, name, slug, clickhouse_project_id, api_key_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [orgId, name, slug, clickhouseId, apiKeyHash]
    )
    return NextResponse.json({ data: { projectId: rows[0].id, apiKey } })
  } catch (err) {
    console.error('Erro projeto:', err)
    return NextResponse.json({ error: { message: 'Erro interno' } }, { status: 500 })
  }
}
