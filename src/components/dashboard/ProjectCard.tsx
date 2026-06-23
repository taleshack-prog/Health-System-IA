"use client"

export function ProjectCard({ project }: { project: { id: string; name: string; clickhouse_project_id: number } }) {
  async function handleDelete() {
    if (!confirm("Tem certeza que deseja remover " + project.name + "?")) return
    await fetch("/api/projects/" + project.id, { method: "DELETE" })
    window.location.reload()
  }

  return (
    <div style={{ position: "relative", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px" }}>
      <a href={"/dashboard/" + project.id + "/overview"} style={{ display: "block", textDecoration: "none" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 6 }}>{project.name}</div>
        <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>ID #{project.clickhouse_project_id}</div>
        <div style={{ marginTop: 16, fontSize: 12, color: "#818cf8" }}>Ver dashboard →</div>
      </a>
      <button
        onClick={handleDelete}
        style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 16, padding: 4, lineHeight: 1 }}
        title="Remover projeto"
      >
        ✕
      </button>
    </div>
  )
}
