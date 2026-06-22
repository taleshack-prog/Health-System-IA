import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/neon/client'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, orgName } = await req.json()
    if (!name || !email || !password || !orgName) {
      return NextResponse.json({ error: { message: 'Todos os campos sao obrigatorios' } }, { status: 400 })
    }
    const existing = await sql('SELECT id FROM hack_tech_farm.users WHERE email = $1 LIMIT 1', [email])
    if (existing.length) {
      return NextResponse.json({ error: { message: 'Email ja cadastrado' } }, { status: 409 })
    }
    const passwordHash = createHash('sha256').update(password).digest('hex')
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
    const tierRows = await sql('SELECT id FROM hack_tech_farm.tiers WHERE code = $1 LIMIT 1', ['starter'])
    const tierId = tierRows[0]?.id ?? 1
    const orgRows = await sql('INSERT INTO hack_tech_farm.organizations (name, slug, tier_id) VALUES ($1, $2, $3) RETURNING id', [orgName, slug, tierId])
    const orgId = orgRows[0].id
    const userRows = await sql('INSERT INTO hack_tech_farm.users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id', [email, passwordHash, name])
    const userId = userRows[0].id
    await sql('INSERT INTO hack_tech_farm.organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)', [orgId, userId, 'owner'])
    return NextResponse.json({ data: { userId, orgId } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { message: 'Erro interno' } }, { status: 500 })
  }
}
