import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql } from "@/lib/neon/client"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId
  const projects = orgId ? await sql(
    "SELECT id, name, slug, clickhouse_project_id FROM hack_tech_farm.projects WHERE organization_id = $1 AND is_archived = false ORDER BY created_at DESC",
    [orgId]
  ) : []

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e2e8f0", fontFamily: "sans-serif", padding: 32 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Hack<span style={{ color: "#6366f1" }}>Farm</span></div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Ola, {session.user.name}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/pricing" style={{ fontSize: 12, color: "#6366f1", textDecoration: "none", border: "1px solid rgba(99,102,241,0.3)", padding: "6px 14px", borderRadius: 8 }}>Upgrade</a>
            <a href="/api/auth/signout" style={{ fontSize: 12, color: "#64748b", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 14px", borderRadius: 8 }}>Sair</a>
          </div>
        </div>

        {projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
            <div style={{ fontSize: 15, color: "#94a3b8", marginBottom: 20 }}>Nenhum projeto ainda</div>
            <a href="/dashboard/new-project" style={{ background: "#6366f1", color: "#fff", padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Criar primeiro projeto</a>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {(projects as any[]).map(p => (
              <div key={p.id} style={{ position: "relative", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px" }}>
                <a href={"/dashboard/" + p.id + "/overview"} style={{ display: "block", textDecoration: "none" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 6 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>ID #{p.clickhouse_project_id}</div>
                  <div style={{ marginTop: 16, fontSize: 12, color: "#818cf8" }}>Ver dashboard →</div>
                </a>
                <form action={"/api/projects/" + p.id} method="DELETE" style={{ position: "absolute", top: 12, right: 12 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Tem certeza que deseja remover este projeto?")) return
                      await fetch("/api/projects/" + p.id, { method: "DELETE" })
                      window.location.reload()
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 16, padding: 4 }}
                    title="Remover projeto"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
            <a href="/dashboard/new-project" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, padding: "20px 22px", color: "#475569", fontSize: 13 }}>+ Novo projeto</a>
          </div>
        )}
      </div>
    </div>
  )
}
