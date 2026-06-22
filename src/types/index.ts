export type SpanStatus = 'UNSET' | 'OK' | 'ERROR'
export type SpanKind = 'server' | 'client' | 'producer' | 'consumer' | 'internal'
export type SeverityText = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
export type ServiceHealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

export interface ServiceHealth {
  serviceName: string
  status: ServiceHealthStatus
  errorRatePct: number
  avgLatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  totalSpans24h: number
  errorCount24h: number
}

export interface TraceListItem {
  traceId: string
  spanId: string
  serviceName: string
  spanName: string
  statusCode: SpanStatus
  durationMs: number
  startTime: string
}

export interface ApiError {
  error: {
    code: 'INVALID_API_KEY' | 'QUOTA_EXCEEDED' | 'INVALID_PAYLOAD' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR'
    message: string
    details?: unknown
  }
}
