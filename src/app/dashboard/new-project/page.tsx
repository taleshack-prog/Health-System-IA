'use client'
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const VERCEL_CLIENT_ID = process.env.NEXT_PUBLIC_VERCEL_CLIENT_ID || "oac_Q4qi8cAlXABoDSLkeG9JKSNf"
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://health-system-ia.vercel.app"
  const vercelOAuthUrl = "https://vercel.com/integrations/hackfarm-observability/new"

  async function handleManual(e: React.FormEvent) {
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
      setApiKey(data.data.apiKey)
    }
  }

  if (apiKey) return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 480 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>Projeto criado!</div>
        <div style={{ fontSize: 13, color: "#f59e0b", marginBottom: 20 }}>Copie a API key agora — ela nao sera exibida novamente.</div>
        <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "#a5b4fc", wordBreak: "break-all", marginBottom: 16 }}>{apiKey}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
          Cole no terminal do seu projeto:
        </div>
        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 13, color: "#4ade80", marginBottom: 24 }}>
          HACKFARM_API_KEY={apiKey.slice(0, 20)}...
        </div>
        <a href="/dashboard" style={{ background: "#6366f1", color: "#fff", padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Ir para o dashboard</a>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 460 }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>Hack<span style={{ color: "#6366f1" }}>Farm</span></div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Conecte seu app em segundos</div>
        </div>

        <a href={vercelOAuthUrl} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          background: "#fff", color: "#000", padding: "12px", borderRadius: 10,
          textDecoration: "none", fontSize: 14, fontWeight: 700, marginBottom: 16,
          border: "none", width: "100%", boxSizing: "border-box",
        }}>
          <svg width="20" height="20" viewBox="0 0 76 65" fill="none">
            <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="#000"/>
          </svg>
          Conectar com Vercel
        </a>

        <div style={{ textAlign: "center", fontSize: 12, color: "#475569", marginBottom: 20 }}>
          1 clique — sem terminal, sem configuracao manual
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}/>
          <span style={{ fontSize: 11, color: "#475569" }}>ou crie manualmente</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}/>
        </div>

        <form onSubmit={handleManual} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Nome do projeto</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="meu-app-producao"
              style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "8px 12px" }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: "11px", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 8, color: "#a5b4fc", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Criando..." : "Criar projeto manualmente"}
          </button>
        </form>

        <a href="/dashboard" style={{ display: "block", textAlign: "center", fontSize: 12, color: "#475569", textDecoration: "none", marginTop: 16 }}>Cancelar</a>
      </div>
    </div>
  )
}
