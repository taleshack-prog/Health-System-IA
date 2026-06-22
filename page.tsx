'use client'

/**
 * src/app/dashboard/overview/page.tsx
 *
 * Service Health Overview — Fase 2 (dados mockados para validação de UX)
 * Quando o ClickHouse estiver conectado, substituir MOCK_SERVICES
 * pela chamada: const services = await getServiceHealth(projectId)
 */

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

// ---------------------------------------------------------------------------
// Tipos locais
// ---------------------------------------------------------------------------
type ServiceStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

interface ServiceHealth {
  serviceName: string
  status: ServiceStatus
  errorRatePct: number
  avgLatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  totalSpans24h: number
  errorCount24h: number
  trend: { hour: string; errors: number; latency: number }[]
}

// ---------------------------------------------------------------------------
// Dados mock — substituir por fetch real na Fase 3
// ---------------------------------------------------------------------------
const MOCK_SERVICES: ServiceHealth[] = [
  {
    serviceName: 'api-gateway',
    status: 'healthy',
    errorRatePct: 0.4,
    avgLatencyMs: 42,
    p95LatencyMs: 120,
    p99LatencyMs: 280,
    totalSpans24h: 128450,
    errorCount24h: 514,
    trend: Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}h`,
      errors: Math.round(Math.random() * 30 + 5),
      latency: Math.round(Math.random() * 30 + 35),
    })),
  },
  {
    serviceName: 'auth-service',
    status: 'healthy',
    errorRatePct: 0.1,
    avgLatencyMs: 18,
    p95LatencyMs: 55,
    p99LatencyMs: 120,
    totalSpans24h: 54200,
    errorCount24h: 54,
    trend: Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}h`,
      errors: Math.round(Math.random() * 5),
      latency: Math.round(Math.random() * 10 + 14),
    })),
  },
  {
    serviceName: 'user-service',
    status: 'degraded',
    errorRatePct: 6.2,
    avgLatencyMs: 380,
    p95LatencyMs: 890,
    p99LatencyMs: 1850,
    totalSpans24h: 32100,
    errorCount24h: 1990,
    trend: Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}h`,
      errors: Math.round(Math.random() * 120 + 60),
      latency: Math.round(Math.random() * 200 + 300),
    })),
  },
  {
    serviceName: 'payment-service',
    status: 'healthy',
    errorRatePct: 0.05,
    avgLatencyMs: 210,
    p95LatencyMs: 450,
    p99LatencyMs: 780,
    totalSpans24h: 8900,
    errorCount24h: 4,
    trend: Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}h`,
      errors: Math.round(Math.random() * 2),
      latency: Math.round(Math.random() * 80 + 180),
    })),
  },
  {
    serviceName: 'notification-worker',
    status: 'critical',
    errorRatePct: 18.7,
    avgLatencyMs: 2100,
    p95LatencyMs: 4800,
    p99LatencyMs: 8200,
    totalSpans24h: 12400,
    errorCount24h: 2319,
    trend: Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}h`,
      errors: Math.round(Math.random() * 200 + 80),
      latency: Math.round(Math.random() * 1000 + 1800),
    })),
  },
]

const MOCK_ERROR_TREND = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  return {
    day: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    errorCount: Math.round(Math.random() * 800 + 100),
    totalSpans: Math.round(Math.random() * 50000 + 20000),
    errorRatePct: Math.round(Math.random() * 5 * 100) / 100,
  }
})

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------
function StatusDot({ status }: { status: ServiceStatus }) {
  const colors: Record<ServiceStatus, string> = {
    healthy: '#22c55e',
    degraded: '#f59e0b',
    critical: '#ef4444',
    unknown: '#6b7280',
  }
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: colors[status],
        boxShadow: status === 'critical' ? `0 0 8px ${colors[status]}` : undefined,
        flexShrink: 0,
      }}
    />
  )
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const labels: Record<ServiceStatus, string> = {
    healthy: 'Saudável',
    degraded: 'Degradado',
    critical: 'Crítico',
    unknown: 'Desconhecido',
  }
  const styles: Record<ServiceStatus, { background: string; color: string; border: string }> = {
    healthy: { background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' },
    degraded: { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
    critical: { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)' },
    unknown: { background: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.3)' },
  }
  const s = styles[status]
  return (
    <span
      style={{
        ...s,
        padding: '2px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {labels[status]}
    </span>
  )
}

function MetricPill({
  label,
  value,
  unit,
  warn,
  danger,
}: {
  label: string
  value: number
  unit: string
  warn?: number
  danger?: number
}) {
  const color =
    danger !== undefined && value >= danger
      ? '#ef4444'
      : warn !== undefined && value >= warn
      ? '#f59e0b'
      : '#94a3b8'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
        <span style={{ fontSize: 10, color: '#64748b', marginLeft: 2, fontWeight: 400 }}>{unit}</span>
      </span>
    </div>
  )
}

function ServiceCard({
  service,
  selected,
  onClick,
}: {
  service: ServiceHealth
  selected: boolean
  onClick: () => void
}) {
  const borderColor =
    service.status === 'critical'
      ? 'rgba(239,68,68,0.4)'
      : service.status === 'degraded'
      ? 'rgba(245,158,11,0.3)'
      : selected
      ? 'rgba(99,102,241,0.5)'
      : 'rgba(255,255,255,0.06)'

  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: selected ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: '16px 18px',
        transition: 'all 0.18s ease',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <StatusDot status={service.status} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#e2e8f0',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {service.serviceName}
          </span>
        </div>
        <StatusBadge status={service.status} />
      </div>

      {/* Mini sparkline de erros */}
      <div style={{ height: 36 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={service.trend.slice(-12)} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${service.serviceName}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={service.status === 'critical' ? '#ef4444' : service.status === 'degraded' ? '#f59e0b' : '#6366f1'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={service.status === 'critical' ? '#ef4444' : service.status === 'degraded' ? '#f59e0b' : '#6366f1'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="errors"
              stroke={service.status === 'critical' ? '#ef4444' : service.status === 'degraded' ? '#f59e0b' : '#6366f1'}
              fill={`url(#grad-${service.serviceName})`}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <MetricPill label="Erro" value={service.errorRatePct} unit="%" warn={2} danger={8} />
        <MetricPill label="Avg P50" value={service.avgLatencyMs} unit="ms" warn={300} danger={1000} />
        <MetricPill label="P95" value={service.p95LatencyMs} unit="ms" warn={800} danger={3000} />
      </div>

      <div style={{ fontSize: 11, color: '#475569', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
        {service.totalSpans24h.toLocaleString('pt-BR')} spans · {service.errorCount24h.toLocaleString('pt-BR')} erros nas últimas 24h
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function OverviewPage() {
  const [selected, setSelected] = useState<string | null>('notification-worker')
  const [filterStatus, setFilterStatus] = useState<ServiceStatus | 'all'>('all')

  const selectedService = MOCK_SERVICES.find(s => s.serviceName === selected)

  const filteredServices =
    filterStatus === 'all' ? MOCK_SERVICES : MOCK_SERVICES.filter(s => s.status === filterStatus)

  const criticalCount = MOCK_SERVICES.filter(s => s.status === 'critical').length
  const degradedCount = MOCK_SERVICES.filter(s => s.status === 'degraded').length
  const healthyCount = MOCK_SERVICES.filter(s => s.status === 'healthy').length

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0e1a',
        color: '#e2e8f0',
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#f1f5f9' }}>
                Hack<span style={{ color: '#6366f1' }}>Farm</span>
              </span>
              <span style={{ fontSize: 12, color: '#475569', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', padding: '2px 8px', borderRadius: 20 }}>
                Observabilidade
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.025em' }}>
              Service Health Overview
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Último refresh: {new Date().toLocaleTimeString('pt-BR')} · projeto #1
            </p>
          </div>

          {/* Summary badges */}
          <div style={{ display: 'flex', gap: 10 }}>
            {criticalCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 14px', borderRadius: 8 }}>
                <StatusDot status="critical" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{criticalCount} crítico{criticalCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {degradedCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '6px 14px', borderRadius: 8 }}>
                <StatusDot status="degraded" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>{degradedCount} degradado{degradedCount > 1 ? 's' : ''}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', padding: '6px 14px', borderRadius: 8 }}>
              <StatusDot status="healthy" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>{healthyCount} saudáve{healthyCount === 1 ? 'l' : 'is'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['all', 'critical', 'degraded', 'healthy'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: filterStatus === f ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filterStatus === f ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: filterStatus === f ? '#a5b4fc' : '#64748b',
              transition: 'all 0.15s',
            }}
          >
            {f === 'all' ? 'Todos' : f === 'critical' ? 'Críticos' : f === 'degraded' ? 'Degradados' : 'Saudáveis'}
          </button>
        ))}
      </div>

      {/* Layout principal: cards + detalhe */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 380px) 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Lista de serviços */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredServices.map(service => (
            <ServiceCard
              key={service.serviceName}
              service={service}
              selected={selected === service.serviceName}
              onClick={() => setSelected(service.serviceName)}
            />
          ))}
        </div>

        {/* Painel de detalhe do serviço selecionado */}
        {selectedService ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header do detalhe */}
            <div
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '20px 24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <StatusDot status={selectedService.status} />
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9' }}>
                  {selectedService.serviceName}
                </h2>
                <StatusBadge status={selectedService.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 20 }}>
                <MetricPill label="Taxa de erro" value={selectedService.errorRatePct} unit="%" warn={2} danger={8} />
                <MetricPill label="Latência média" value={selectedService.avgLatencyMs} unit="ms" warn={300} danger={1000} />
                <MetricPill label="P95" value={selectedService.p95LatencyMs} unit="ms" warn={800} danger={3000} />
                <MetricPill label="P99" value={selectedService.p99LatencyMs} unit="ms" warn={2000} danger={5000} />
                <MetricPill label="Total spans 24h" value={selectedService.totalSpans24h} unit="" />
                <MetricPill label="Erros 24h" value={selectedService.errorCount24h} unit="" />
              </div>
            </div>

            {/* Gráfico de latência nas últimas 24h */}
            <div
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '20px 24px',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Latência — Últimas 24 horas
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={selectedService.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                    unit="ms"
                  />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#a5b4fc' }}
                    formatter={(v: number) => [`${v}ms`, 'Latência']}
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="#6366f1"
                    fill="url(#latGrad)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#6366f1' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de erros por hora */}
            <div
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '20px 24px',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Erros por hora — últimas 24h
              </h3>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={selectedService.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#f87171' }}
                    formatter={(v: number) => [v, 'Erros']}
                  />
                  <Bar dataKey="errors" radius={[3, 3, 0, 0]} maxBarSize={18}>
                    {selectedService.trend.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.errors > 150
                            ? '#ef4444'
                            : entry.errors > 60
                            ? '#f59e0b'
                            : '#6366f1'
                        }
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Error trend 30 dias (global do projeto) */}
            <div
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '20px 24px',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Taxa de erros global — últimos 30 dias
              </h3>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={MOCK_ERROR_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="errGrad30" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#f87171' }}
                    formatter={(v: number) => [`${v}%`, 'Taxa de erros']}
                  />
                  <Area
                    type="monotone"
                    dataKey="errorRatePct"
                    stroke="#ef4444"
                    fill="url(#errGrad30)"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 300,
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 14,
              color: '#475569',
              fontSize: 14,
              gap: 8,
            }}
          >
            <span style={{ fontSize: 28 }}>📊</span>
            <span>Selecione um serviço para ver os detalhes</span>
          </div>
        )}
      </div>
    </div>
  )
}
