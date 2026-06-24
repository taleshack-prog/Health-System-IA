"use client"
import { useState } from "react"

export default function NewProjectPage() {
  const [step, setStep] = useState<"choose" | "manual" | "success">("choose")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [projectData, setProjectData] = useState<{ apiKey: string; projectId: string } | null>(null)

  const VERCEL_OAUTH_URL = "https://vercel.com/oauth/authorize?client_id=oac_Q4qi8cAlXABoDSLkeG9JKSNf&redirect_uri=https://health-system-ia.vercel.app/api/vercel/callback&response_type=code&scope=read_write"

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error?.message ?? "Erro ao criar projeto")
      setLoading(false)
    } else {
      setProjectData({ apiKey: data.data.apiKey, projectId: data.data.projectId })
      setStep("success")
    }
  }

  if (step === "success" && projectData) return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: 24 }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "36px", width: "100%", maxWidth: 560 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>✅ Projeto criado!</div>
        <div style={{ fontSize: 13, color: "#f59e0b", marginBottom: 24 }}>Guarde a API key — ela não será exibida novamente.</div>

        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "#a5b4fc", wordBreak: "break-all", marginBottom: 24 }}>
          {projectData.apiKey}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Como conectar seu app
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", marginBottom: 8 }}>Node.js / Next.js</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#e2e8f0", lineHeight: 1.8 }}>
              <div style={{ color: "#64748b" }}>{"# No terminal do seu projeto:"}</div>
              <div>{"npx hackfarm-init"}</div>
              <div style={{ color: "#64748b", marginTop: 8 }}>{"# Cole quando solicitado:"}</div>
              <div style={{ color: "#4ade80" }}>{projectData.apiKey}</div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", marginBottom: 8 }}>Python / FastAPI</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#e2e8f0", lineHeight: 1.8 }}>
              <div style={{ color: "#64748b" }}>{"# No terminal do seu projeto:"}</div>
              <div>{"npx hackfarm-init"}</div>
              <div style={{ color: "#64748b", marginTop: 8 }}>{"# Cole quando solicitado:"}</div>
              <div style={{ color: "#4ade80" }}>{projectData.apiKey}</div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", marginBottom: 8 }}>Qualquer framework — variável de ambiente</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#e2e8f0", lineHeight: 1.8 }}>
              <div>{"HACKFARM_API_KEY=" + projectData.apiKey}</div>
              <div>{"HACKFARM_URL=https://health-system-ia.vercel.app"}</div>
            </div>
          </div>
        </div>

        <a href="/dashboard" style={{ display: "block", textAlign: "center", background: "#6366f1", color: "#fff", padding: "12px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
          Ir para o dashboard →
        </a>
      </div>
    </div>
  )

  if (step === "manual") return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: 24 }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "36px", width: "100%", maxWidth: 420 }}>
        <button onClick={() => setStep("choose")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Voltar</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>Nome do projeto</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>Como quer chamar este projeto no dashboard?</div>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)} required
            placeholder="meu-app-producao"
            style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          {error && <div style={{ fontSize: 12, color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "8px 12px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: "12px", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Criando..." : "Criar projeto e gerar API key"}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 500 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>Hack<span style={{ color: "#6366f1" }}>Farm</span></div>
          <div style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>Como quer conectar seu app?</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a href={VERCEL_OAUTH_URL} style={{
            display: "flex", alignItems: "center", gap: 16,
            background: "#fff", color: "#000", padding: "20px 24px",
            borderRadius: 12, textDecoration: "none", border: "none",
          }}>
            <svg width="24" height="24" viewBox="0 0 76 65" fill="none">
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="#000"/>
            </svg>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Conectar com Vercel</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>1 clique — injeta automaticamente nos seus projetos</div>
            </div>
          </a>

          <button onClick={() => setStep("manual")} style={{
            display: "flex", alignItems: "center", gap: 16,
            background: "rgba(255,255,255,0.04)", color: "#e2e8f0",
            padding: "20px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", textAlign: "left", width: "100%",
          }}>
            <span style={{ fontSize: 24 }}>📋</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Gerar API key manualmente</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Para qualquer plataforma — Railway, Render, AWS, VPS...</div>
            </div>
          </button>

          <button onClick={() => setStep("manual")} style={{
            display: "flex", alignItems: "center", gap: 16,
            background: "rgba(255,255,255,0.04)", color: "#e2e8f0",
            padding: "20px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", textAlign: "left", width: "100%",
          }}>
            <span style={{ fontSize: 24 }}>🐍</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Python / FastAPI</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Django, FastAPI, Flask — qualquer backend Python</div>
            </div>
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/dashboard" style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>Cancelar</a>
        </div>
      </div>
    </div>
  )
}
