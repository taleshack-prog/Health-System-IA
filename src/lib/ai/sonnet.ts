import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface RcaResult {
  title: string
  summary: string
  root_cause: string
  impact_analysis: string
  recommendations: {
    action: string
    priority: "high" | "medium" | "low"
    effort: "low" | "medium" | "high"
    details: string
  }[]
  confidence_score: number
}

export async function runSonnetRca(prompt: string): Promise<RcaResult | null> {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("")

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0]) as RcaResult
  } catch (err) {
    console.error("[Sonnet] Erro no RCA:", err)
    return null
  }
}
