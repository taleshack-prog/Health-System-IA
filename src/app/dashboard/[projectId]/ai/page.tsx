"use client"
import { useState } from "react"
import { useParams } from "next/navigation"

interface Recommendation {
  action: string
  priority: "high" | "medium" | "low"
  effort: "low" | "medium" | "high"
  details: string
}

interface DiagnosisResult {
  diagnosisId: string
  status: string
  triage?: { severity: string; error_type: string; summary: string }
  rca?: {
    title: string
    summary: string
    root_cause: string
    impact_analysis: string
    recommendations: Recommendation[]
    confidence_score: number
  }
  message?: string
}

export default function AiDiagnosisPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [error, setError] = useState("")

  async function runDiagnosis() {
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message ?? "Erro ao executar diagnóstico")
      } else {
        setResult(data.data)
      }
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  const severityColor = (s?: string) => {
    if (s === "CRITICAL") return "#ef4444"
    if (s === "HIGH") return "#f59e0b"
    if (s === "MEDIUM") return "#6366f1"
    return "#22c55e"
  }

  const priorityColor = (p: string) => {
    if (p === "high") return "#ef4444"
    if (p === "medium") return "#f59e0b"
    return "#22c55e"
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e2e8f0", fontFamily: "sans-serif", padding: 28 }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <a href={"/dashboard/" + projectId + "/overview"} style={{ fontSize: 12, color: "#475569", textDecoration: "none" }}>← Overview</a>
          <span style={{ color: "#1e293b" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>Diagnóstico IA</span>
        </div>

        <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: "24px 28px", marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
            Diagnóstico Assistido por IA
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
            O Claude Haiku faz a triagem dos erros da última hora. Se encontrar algo crítico, o Claude Sonnet gera um RCA completo com causa raiz e recomendações.
          </div>
          <button
            onClick={runDiagnosis}
            disabled={loading}
            style={{
              padding: "10px 24px", background: loading ? "rgba(99,102,241,0.4)" : "#6366f1",
              border: "none", borderRadius: 8, color: "#fff", fontSize: 14,
              fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "⏳ Analisando com IA..." : "🔍 Executar diagnóstico"}
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, color: "#f87171", fontSize: 13 }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {result.message && (
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ fontSize: 14, color: "#4ade80", fontWeight: 600 }}>✅ {result.message}</div>
              </div>
            )}

            {result.triage && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Triagem — Claude Haiku</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ background: severityColor(result.triage.severity) + "22", border: "1px solid " + severityColor(result.triage.severity) + "55", color: severityColor(result.triage.severity), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {result.triage.severity}
                  </span>
                  <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "monospace" }}>{result.triage.error_type}</span>
                </div>
                <div style={{ fontSize: 14, color: "#e2e8f0" }}>{result.triage.summary}</div>
              </div>
            )}

            {result.rca && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>RCA Completo — Claude Sonnet</div>

                <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{result.rca.title}</div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Confiança:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: result.rca.confidence_score >= 0.8 ? "#4ade80" : result.rca.confidence_score >= 0.5 ? "#fbbf24" : "#f87171" }}>
                    {Math.round(result.rca.confidence_score * 100)}%
                  </span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Resumo</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>{result.rca.summary}</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Causa Raiz</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace" }}>{result.rca.root_cause}</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Impacto</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>{result.rca.impact_analysis}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Recomendações</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.rca.recommendations.map((rec, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: priorityColor(rec.priority), background: priorityColor(rec.priority) + "22", padding: "2px 8px", borderRadius: 4 }}>
                            {rec.priority.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>esforço: {rec.effort}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>{rec.action}</div>
                        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{rec.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
