import { chQuery, chInsert } from './client'
import type { ServiceHealth, TraceListItem } from '@/types'

function deriveStatus(errorRatePct: number, avgLatencyMs: number): ServiceHealth['status'] {
  if (isNaN(errorRatePct)) return 'unknown'
  if (errorRatePct >= 10 || avgLatencyMs >= 2000) return 'critical'
  if (errorRatePct >= 2 || avgLatencyMs >= 500) return 'degraded'
  return 'healthy'
}

export async function getServiceHealth(projectId: number): Promise<ServiceHealth[]> {
  const rows = await chQuery<{
    service_name: string
    total_spans_24h: string
    error_count_24h: string
    error_rate_pct: string
    avg_latency_ms: string
    p95_latency_ms: string
    p99_latency_ms: string
  }>(
    `SELECT service_name, total_spans_24h, error_count_24h, error_rate_pct,
            avg_latency_ms, p95_latency_ms, p99_latency_ms
     FROM hackfarm_observability.v_service_health_24h
     WHERE project_id = {project_id: UInt32}
     ORDER BY error_count_24h DESC`,
    { project_id: projectId }
  )
  return rows.map(r => ({
    serviceName: r.service_name,
    status: deriveStatus(Number(r.error_rate_pct), Number(r.avg_latency_ms)),
    errorRatePct: Number(r.error_rate_pct),
    avgLatencyMs: Number(r.avg_latency_ms),
    p95LatencyMs: Number(r.p95_latency_ms),
    p99LatencyMs: Number(r.p99_latency_ms),
    totalSpans24h: Number(r.total_spans_24h),
    errorCount24h: Number(r.error_count_24h),
  }))
}

export interface SpanInsert {
  trace_id: string
  span_id: string
  parent_span_id: string
  project_id: number
  service_name: string
  service_namespace: string
  span_name: string
  span_kind: string
  start_time: string
  end_time: string
  duration_us: number
  status_code: string
  status_message: string
  attributes: Record<string, string>
  ts_date: string
}

export async function insertSpans(spans: SpanInsert[]): Promise<void> {
  await chInsert('hackfarm_observability.otel_traces', spans)
}

export async function getRecentTraces(filters: {
  projectId: number
  service?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<TraceListItem[]> {
  const { projectId, limit = 50, offset = 0 } = filters
  const rows = await chQuery<{
    trace_id: string; span_id: string; service_name: string
    span_name: string; status_code: string; duration_us: string; start_time: string
  }>(
    `SELECT trace_id, span_id, service_name, span_name, status_code, duration_us, start_time
     FROM hackfarm_observability.otel_traces
     WHERE project_id = {project_id: UInt32}
       AND parent_span_id = ''
       AND start_time >= now() - INTERVAL 24 HOUR
     ORDER BY start_time DESC
     LIMIT {limit: UInt32} OFFSET {offset: UInt32}`,
    { project_id: projectId, limit, offset }
  )
  return rows.map(r => ({
    traceId: r.trace_id,
    spanId: r.span_id,
    serviceName: r.service_name,
    spanName: r.span_name,
    statusCode: r.status_code as 'OK' | 'ERROR' | 'UNSET',
    durationMs: Math.round(Number(r.duration_us) / 1000),
    startTime: r.start_time,
  }))
}
