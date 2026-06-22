import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateProjectApiKey, upsertProjectService } from '@/lib/neon/client'
import { insertSpans } from '@/lib/clickhouse/queries'
import type { ApiError } from '@/types'

// ---------------------------------------------------------------------------
// Schema de validação — OTLP/HTTP JSON format (simplificado)
// ---------------------------------------------------------------------------
const SpanSchema = z.object({
  traceId: z.string().length(32),
  spanId: z.string().length(16),
  parentSpanId: z.string().optional().default(''),
  name: z.string().min(1).max(500),
  kind: z.enum(['server', 'client', 'producer', 'consumer', 'internal']).default('internal'),
  startTimeUnixNano: z.string(), // OTel usa nanoseconds como string (int64)
  endTimeUnixNano: z.string(),
  status: z.object({
    code: z.enum(['UNSET', 'OK', 'ERROR']).default('UNSET'),
    message: z.string().optional().default(''),
  }).optional().default({}),
  attributes: z.record(z.string()).optional().default({}),
})

const ResourceSchema = z.object({
  attributes: z.record(z.string()).optional().default({}),
})

const ScopeSpansSchema = z.object({
  scope: z.object({ name: z.string().optional() }).optional(),
  spans: z.array(SpanSchema),
})

const ResourceSpansSchema = z.object({
  resource: ResourceSchema.optional(),
  scopeSpans: z.array(ScopeSpansSchema),
})

const OtlpTracesPayloadSchema = z.object({
  resourceSpans: z.array(ResourceSpansSchema),
})

// ---------------------------------------------------------------------------
// POST /api/telemetry/traces
// Header obrigatório: x-api-key — chave de ingestão do projeto
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // 1. Autenticação
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return errorResponse('INVALID_API_KEY', 'Header x-api-key é obrigatório', 401)
  }

  const project = await validateProjectApiKey(apiKey)
  if (!project) {
    return errorResponse('INVALID_API_KEY', 'API key inválida ou projeto arquivado', 401)
  }

  // 2. Parse e validação do payload
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('INVALID_PAYLOAD', 'Body deve ser JSON válido', 400)
  }

  const parsed = OtlpTracesPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('INVALID_PAYLOAD', 'Payload OTel inválido', 400, parsed.error.issues)
  }

  // 3. Transforma e insere no ClickHouse
  const spansToInsert = []
  const servicesDetected = new Set<string>()

  for (const resourceSpan of parsed.data.resourceSpans) {
    const serviceName =
      resourceSpan.resource?.attributes?.['service.name'] ?? 'unknown'
    const serviceNamespace =
      resourceSpan.resource?.attributes?.['service.namespace'] ?? ''

    servicesDetected.add(serviceName)

    for (const scopeSpans of resourceSpan.scopeSpans) {
      for (const span of scopeSpans.spans) {
        const startNs = BigInt(span.startTimeUnixNano)
        const endNs = BigInt(span.endTimeUnixNano)
        const startUs = Number(startNs / 1000n)
        const durationUs = Number((endNs - startNs) / 1000n)

        // Converte timestamp para ISO string que o ClickHouse aceita
        const startIso = new Date(startUs / 1000).toISOString().replace('T', ' ').replace('Z', '')
        const endIso = new Date(Number(endNs / 1000n) / 1000).toISOString().replace('T', ' ').replace('Z', '')
        const dateStr = startIso.slice(0, 10)

        spansToInsert.push({
          trace_id: span.traceId,
          span_id: span.spanId,
          parent_span_id: span.parentSpanId ?? '',
          project_id: project.clickhouseProjectId,
          service_name: serviceName,
          service_namespace: serviceNamespace,
          span_name: span.name,
          span_kind: span.kind,
          start_time: startIso,
          end_time: endIso,
          duration_us: durationUs,
          status_code: span.status?.code ?? 'UNSET',
          status_message: span.status?.message ?? '',
          attributes: span.attributes ?? {},
          ts_date: dateStr,
        })
      }
    }
  }

  if (spansToInsert.length === 0) {
    return NextResponse.json({ data: { accepted: 0 } })
  }

  // 4. Insere no ClickHouse (async insert — não bloqueia a resposta)
  await insertSpans(spansToInsert)

  // 5. Upsert dos serviços no Neon (background, não bloqueia)
  void Promise.all(
    Array.from(servicesDetected).map(svc =>
      upsertProjectService(project.projectId, svc)
    )
  )

  return NextResponse.json({
    data: { accepted: spansToInsert.length },
  })
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function errorResponse(
  code: ApiError['error']['code'],
  message: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json<ApiError>(
    { error: { code, message, details } },
    { status }
  )
}
