export function buildHaikuTriagePrompt(spans: any[], logs: any[]): string {
  return `Você é um sistema de triagem de erros de software. Analise os dados abaixo e responda APENAS com JSON válido.

SPANS COM ERRO:
${JSON.stringify(spans.slice(0, 5), null, 2)}

LOGS RECENTES:
${JSON.stringify(logs.slice(0, 5), null, 2)}

Responda APENAS com este JSON (sem texto extra):
{
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "error_type": "string (ex: DatabaseTimeout, NullPointer, AuthFailure)",
  "summary": "string (1 linha, máx 100 chars)",
  "needs_rca": boolean
}`
}

export function buildSonnetRcaPrompt(spans: any[], logs: any[], triage: any): string {
  return `Você é um engenheiro sênior de confiabilidade de site (SRE). Faça uma análise de causa raiz (RCA) completa.

TRIAGEM INICIAL:
${JSON.stringify(triage, null, 2)}

SPANS COM ERRO (últimas ocorrências):
${JSON.stringify(spans.slice(0, 10), null, 2)}

LOGS CORRELACIONADOS:
${JSON.stringify(logs.slice(0, 10), null, 2)}

Responda APENAS com este JSON (sem texto extra):
{
  "title": "string (título do incidente, máx 100 chars)",
  "summary": "string (resumo executivo, 2-3 frases)",
  "root_cause": "string (causa raiz técnica detalhada)",
  "impact_analysis": "string (impacto no negócio e usuários)",
  "recommendations": [
    {
      "action": "string (ação concreta)",
      "priority": "high" | "medium" | "low",
      "effort": "low" | "medium" | "high",
      "details": "string (como implementar)"
    }
  ],
  "confidence_score": number (0.0 a 1.0)
}`
}
