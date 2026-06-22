import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/neon/client'

export default async function ProjectOverviewPage({ params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const rows = await sql(
    'SELECT id, name, clickhouse_project_id FROM hack_tech_farm.projects WHERE id = $1 AND is_archived = false LIMIT 1',
    [params.projectId]
  )
  if (!rows.length) redirect('/dashboard')

  const project = rows[0]

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e2e8f0", fontFamily: "sans-serif", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <a href="/dashboard" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>← Projetos</a>
        <span style={{ color: "#1e293b" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{project.name as string}</span>
      </div>

      <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#818cf8", marginBottom: 8, fontWeight: 600 }}>Conecte seu app</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Instale o SDK OpenTelemetry e configure o endpoint:</div>
        <div style={{ fontFamily: "monospace", fontSize: 12, color: "#a5b4fc", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "12px 16px", lineHeight: 1.8 }}>
          <div>HACKFARM_API_KEY={String(project.id).slice(0,8)}...  </div>
          <div>OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000/api/telemetry</div>
          <div>OTEL_EXPORTER_OTLP_HEADERS=x-api-key=SUA_API_KEY</div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "60px 0", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
        <div style={{ fontSize: 16, color: "#94a3b8", marginBottom: 8 }}>Aguardando telemetria</div>
        <div style={{ fontSize: 13, color: "#475569" }}>
          Conecte seu app usando a API key e os dados aparecerão aqui automaticamente.
        </div>
      </div>
    </div>
  )
}
