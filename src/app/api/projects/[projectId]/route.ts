import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/neon/client"

export async function DELETE(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: { message: "Nao autenticado" } }, { status: 401 })
    }

    const orgId = (session.user as any).organizationId
    const rows = await sql(
      "SELECT id FROM hack_tech_farm.projects WHERE id = $1 AND organization_id = $2 LIMIT 1",
      [params.projectId, orgId]
    )

    if (!rows.length) {
      return NextResponse.json({ error: { message: "Projeto nao encontrado" } }, { status: 404 })
    }

    await sql(
      "UPDATE hack_tech_farm.projects SET is_archived = true WHERE id = $1",
      [params.projectId]
    )

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error("Erro ao deletar projeto:", err)
    return NextResponse.json({ error: { message: "Erro interno" } }, { status: 500 })
  }
}
