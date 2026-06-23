"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 49",
    period: "/mês",
    description: "Para indie devs e pequenos times",
    features: [
      "3 projetos",
      "30 dias de retenção",
      "Detecção de anomalias",
      "Dashboard em PT-BR",
      "Suporte por email",
    ],
    cta: "Começar agora",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 129",
    period: "/mês",
    description: "Observabilidade completa com IA",
    features: [
      "10 projetos",
      "90 dias de retenção",
      "Diagnóstico IA (Claude Sonnet)",
      "RCA com causa raiz",
      "Alertas em tempo real",
      "Dashboard em PT-BR",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    highlighted: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSubscribe(planId: string) {
    setLoading(planId)
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    })
    const data = await res.json()
    if (data.data?.url) {
      window.location.href = data.data.url
    } else if (data.error?.message === "Nao autenticado") {
      router.push("/login")
    }
    setLoading(null)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e2e8f0", fontFamily: "sans-serif", padding: "60px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 13, color: "#6366f1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
            Planos
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#f1f5f9", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            Simples e transparente
          </h1>
          <p style={{ fontSize: 16, color: "#64748b", margin: 0 }}>
            Sem surpresas. Cancele quando quiser.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background: plan.highlighted ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
              border: plan.highlighted ? "2px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "32px 28px",
              position: "relative",
            }}>
              {plan.highlighted && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "#6366f1", color: "#fff", fontSize: 11, fontWeight: 700,
                  padding: "4px 14px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Mais popular
                </div>
              )}

              <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>{plan.name}</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{plan.description}</div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#f1f5f9" }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: "#64748b" }}>{plan.period}</span>
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: "100%", padding: "12px", borderRadius: 8, border: "none",
                  background: plan.highlighted ? "#6366f1" : "rgba(255,255,255,0.08)",
                  color: plan.highlighted ? "#fff" : "#94a3b8",
                  fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 24,
                  opacity: loading === plan.id ? 0.7 : 1,
                }}
              >
                {loading === plan.id ? "Redirecionando..." : plan.cta}
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8" }}>
                    <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "#475569" }}>
          <a href="/dashboard" style={{ color: "#6366f1", textDecoration: "none" }}>← Voltar ao dashboard</a>
        </div>
      </div>
    </div>
  )
}
