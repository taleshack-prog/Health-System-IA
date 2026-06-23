import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/neon/client"
import { chQuery } from "@/lib/clickhouse/client"
import { buildHaikuTriagePrompt, buildSonnetRcaPrompt } from "@/lib/ai/prompts"
import { runHaikuTriage } from "@/lib/ai/haiku"
import { runSonnetRca } from "@/lib/ai/sonnet"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: { message: "Nao autenticado" } }, { status: 401 })
    }

    const { projectId } = await req.json()
    if (!projectId) {
      return NextResponse.json({ error: { message: "projectId obrigatorio" } }, { status: 400 })
    }

    const projects = await sql(
      "SELECT clickhouse_project_id FROM hack_tech_farm.projects WHERE id = $1 LIMIT 1",
      [projectId]
    )
    if (!projects.length) {
      return NextResponse.json({ error: { message: "Projeto nao encontrado" } }, { status: 404 })
    }

    const chProjectId = projects[0].clickhouse_project_id as number

    const diagRow = await sql(
      "INSERT INTO hack_tech_farm.ai_diagnoses (project_id, triggered_by, status) VALUES ($1, $2, $3) RETURNING id",
      [projectId, "manual", "running"]
    )
    const diagnosisId = diagRow[0].id as string

    const spans = await chQuery<any>(
      "SELECT trace_id, span_id, service_name, span_name, status_code, status_message, duration_us, start_time, attributes FROM hackfarm_observability.otel_traces WHERE project_id = {project_id: UInt32} AND status_code = 'ERROR' AND start_time >= now() - INTERVAL 1 HOUR ORDER BY start_time DESC LIMIT 20",
      { project_id: chProjectId }
    )

    const logs = await chQuery<any>(
      "SELECT service_name, severity_text, body, timestamp FROM hackfarm_observability.otel_logs WHERE project_id = {project_id: UInt32} AND severity_text IN ('ERROR', 'FATAL') AND timestamp >= now() - INTERVAL 1 HOUR ORDER BY timestamp DESC LIMIT 20",
      { project_id: chProjectId }
    )

    if (spans.length === 0 && logs.length === 0) {
      await sql(
        "UPDATE hack_tech_farm.ai_diagnoses SET status = $1, title = $2, summary = $3, completed_at = NOW() WHERE id = $4",
        ["completed", "Nenhum erro encontrado", "Nao foram encontrados erros na ultima hora.", diagnosisId]
      )
      return NextResponse.json({ data: { diagnosisId, status: "completed", message: "Nenhum erro na ultima hora" } })
    }

    const triagePrompt = buildHaikuTriagePrompt(spans, logs)
    const triage = await runHaikuTriage(triagePrompt)

    if (!triage) {
      await sql("UPDATE hack_tech_farm.ai_diagnoses SET status = $1, completed_at = NOW() WHERE id = $2", ["failed", diagnosisId])
      return NextResponse.json({ error: { message: "Falha na triagem" } }, { status: 500 })
    }

    if (!triage.needs_rca || triage.severity === "LOW") {
      await sql(
        "UPDATE hack_tech_farm.ai_diagnoses SET status = $1, title = $2, summary = $3, completed_at = NOW() WHERE id = $4",
        ["completed", triage.error_type + " — " + triage.severity, triage.summary, diagnosisId]
      )
      return NextResponse.json({ data: { diagnosisId, status: "completed", triage } })
    }

    const rcaPrompt = buildSonnetRcaPrompt(spans, logs, triage)
    const rca = await runSonnetRca(rcaPrompt)

    if (!rca) {
      await sql("UPDATE hack_tech_farm.ai_diagnoses SET status = $1, completed_at = NOW() WHERE id = $2", ["failed", diagnosisId])
      return NextResponse.json({ error: { message: "Falha no RCA" } }, { status: 500 })
    }

    await sql(
      "UPDATE hack_tech_farm.ai_diagnoses SET status = $1, title = $2, summary = $3, root_cause = $4, impact_analysis = $5, recommendations = $6, confidence_score = $7, model_version = $8, completed_at = NOW() WHERE id = $9",
      ["completed", rca.title, rca.summary, rca.root_cause, rca.impact_analysis, JSON.stringify(rca.recommendations), rca.confidence_score, "claude-sonnet-4-6", diagnosisId]
    )

    return NextResponse.json({ data: { diagnosisId, status: "completed", triage, rca } })
  } catch (err) {
    console.error("[AI Diagnose]", err)
    return NextResponse.json({ error: { message: "Erro interno" } }, { status: 500 })
  }
}
