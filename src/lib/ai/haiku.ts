import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface TriageResult {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  error_type: string
  summary: string
  needs_rca: boolean
}

export async function runHaikuTriage(
  prompt: string
): Promise<TriageResult | null> {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("")

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0]) as TriageResult
  } catch (err) {
    console.error("[Haiku] Erro na triagem:", err)
    return null
  }
}
