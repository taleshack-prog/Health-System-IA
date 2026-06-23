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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <a href="/dashboard" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>← Projetos</a>
          <span style={{ color: "#1e293b" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{project.name as string}</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <a href={"/dashboard/" + project.id + "/ai"} style={{ background: "#6366f1", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            🤖 Diagnóstico IA
          </a>
          <a href={"/dashboard/" + project.id + "/overview"} style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 13, border: "1px solid rgba(255,255,255,0.1)" }}>
            📊 Overview
          </a>
        </div>

        <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "#818cf8", marginBottom: 8, fontWeight: 600 }}>SDK de Ingestão</div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
            Rode no terminal do seu app para conectar automaticamente:
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "#a5b4fc", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "14px 16px", lineHeight: 2 }}>
            <div>npx hackfarm-init</div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
            Quando solicitado, use a API key do projeto:
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#6366f1", background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 12px", marginTop: 6, wordBreak: "break-all" }}>
            ID do projeto: {project.id as string}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {[
            { label: "Traces (24h)", value: "—", icon: "📡" },
            { label: "Erros (24h)", value: "—", icon: "🔴" },
            { label: "Latência média", value: "—", icon: "⚡" },
            { label: "Diagnósticos IA", value: "—", icon: "🤖" },
          ].map((m) => (
            <div key={m.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{m.value}</div>
              <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
