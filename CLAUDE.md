# CLAUDE.md — Health-System-IA (Hack Tech Farm)

> Context bundle para Claude Code. Leia este arquivo antes de qualquer tarefa no repositório.

## 1. O Projeto

**Dashboard de Observabilidade Assistida por IA** para desenvolvedores brasileiros que criam
apps com stacks modernas (Vercel, Supabase, Next.js, serverless). Posicionamento: alternativa
ao Datadog/Sentry — 5–10× mais barato, em PT-BR, com diagnóstico de IA (RCA) nativo.

Público-alvo: vibe coders, indie devs, times de startup no Brasil.

Produto: SaaS multi-tenant com tiers (Starter R$ 49 / Pro R$ 129 / Enterprise custom).

## 2. Stack Tecnológica

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR + RSC + edge-ready |
| Estilo | Tailwind CSS + shadcn/ui | Design system consistente |
| Gráficos | Recharts | Dark mode nativo, responsivo |
| Auth | NextAuth.js (Credentials + GitHub OAuth) | Sem vendor lock-in |
| Banco OLTP | Neon (PostgreSQL serverless) | Branching, connection pooling, sem lock-in |
| Banco OLAP | ClickHouse (Docker no Railway) | 1M+ eventos/s, compressão 10× |
| Telemetria | OpenTelemetry SDK (OTLP/HTTP) | Padrão aberto, sem agente |
| Pipeline | Vector (PII masking, roteamento) | VRL transforms, multithreaded |
| IA Triagem | Claude Haiku 3.5 | Barato (R$ 0,005/classificação) |
| IA RCA | Claude Sonnet 4 | Qualidade de análise de causa-raiz |
| Deploy | Railway (ClickHouse + Vector) + Vercel (Next.js) | Free tier no MVP |
| Realtime | Pusher (free: 200 conexões) | WebSocket para atualizações ao vivo |

## 3. Arquitetura de Dados

```
[SDK OTel no cliente]
    │ OTLP/HTTP (x-api-key header)
    ▼
[API Gateway Next.js /api/telemetry/*]
    │ valida project API key (hash no Neon)
    ▼
[Vector Pipeline (Railway)]
    │ PII masking (CPF, CNPJ, email via regex VRL)
    │ roteamento por tipo
    ├──► [ClickHouse (Railway)] ← otel_traces, otel_logs, otel_metrics
    └──► [Neon PostgreSQL]      ← apenas metadados de projeto/usuário
         │
         └──► [Claude Haiku] ← triagem de erros (async job)
                   │ HIGH/CRITICAL apenas
                   ▼
              [Claude Sonnet] ← RCA completo
                   │
                   ▼
              [ai_diagnoses] ← salvo no Neon
              [WebSocket]    ← dashboard atualizado via Pusher
```

## 4. Estrutura de Diretórios

```
health-system-ia/
├── src/
│   ├── app/
│   │   ├── (auth)/              # login, register, onboarding
│   │   ├── dashboard/           # layout principal do dashboard
│   │   │   ├── [projectId]/
│   │   │   │   ├── overview/    # Service Health Overview
│   │   │   │   ├── traces/      # Trace Explorer
│   │   │   │   ├── logs/        # Log Viewer
│   │   │   │   ├── metrics/     # Metrics Dashboard
│   │   │   │   └── ai/          # Diagnósticos e Anomalias
│   │   │   └── layout.tsx
│   │   └── api/
│   │       ├── telemetry/
│   │       │   ├── traces/route.ts
│   │       │   ├── logs/route.ts
│   │       │   └── metrics/route.ts
│   │       ├── ai/
│   │       │   ├── diagnose/route.ts
│   │       │   └── anomalies/route.ts
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── ui/                  # shadcn/ui base components
│   │   ├── dashboard/           # widgets do dashboard
│   │   │   ├── ServiceHealthCard.tsx
│   │   │   ├── TraceList.tsx
│   │   │   ├── ErrorRateChart.tsx
│   │   │   ├── LatencyChart.tsx
│   │   │   └── AIDiagnosisPanel.tsx
│   │   └── charts/              # wrappers Recharts tipados
│   ├── lib/
│   │   ├── clickhouse/
│   │   │   ├── client.ts        # ClickHouse client singleton
│   │   │   └── queries.ts       # queries tipadas por módulo
│   │   ├── neon/
│   │   │   ├── client.ts        # Neon/postgres client
│   │   │   └── schema.ts        # tipos TypeScript do schema
│   │   └── ai/
│   │       ├── haiku.ts         # triagem com Haiku
│   │       ├── sonnet.ts        # RCA com Sonnet
│   │       └── prompts.ts       # prompt templates
│   ├── types/
│   │   ├── telemetry.ts         # OTel types
│   │   ├── dashboard.ts         # tipos do dashboard
│   │   └── api.ts               # request/response types
│   └── hooks/
│       ├── useServiceHealth.ts
│       ├── useTraces.ts
│       └── useAIDiagnosis.ts
├── infra/
│   ├── clickhouse/
│   │   ├── 001_schema.sql       # schema completo ClickHouse
│   │   └── Dockerfile           # Docker para Railway
│   └── neon/
│       └── 001_schema.sql       # schema completo PostgreSQL
├── scripts/
│   ├── seed-mock-data.ts        # dados mock para dev
│   └── test-telemetry.ts        # smoke test de ingestão
├── CLAUDE.md                    # este arquivo
├── .env.example
└── package.json
```

## 5. Regras de Estilo (TypeScript/React)

```typescript
// ✅ Correto — função nomeada + tipos explícitos
export function ServiceHealthCard({ service }: ServiceHealthCardProps) { ... }

// ✅ Correto — imports por alias
import { clickhouseClient } from '@/lib/clickhouse/client'

// ❌ Evitar — any implícito
const data = await fetch(url).then(r => r.json())

// ✅ Correto — tipado
const data = await fetch(url).then(r => r.json() as ServiceHealth[])
```

- Sempre usar `async/await`, nunca `.then().catch()` encadeado
- Server Components por padrão; marcar `'use client'` apenas quando necessário
- Nunca expor credenciais no lado cliente; usar variáveis `NEXT_PUBLIC_` apenas para dados não-sensíveis
- Prefixo `I` proibido em interfaces — usar `type` ou `interface` sem prefixo

## 6. Boas Práticas de Segurança

- API keys de ingestão: sempre comparar com `crypto.timingSafeEqual` (não `===`)
- PII nunca chega ao ClickHouse — o Vector mascarou antes
- Queries ClickHouse: sempre parametrizadas, nunca interpolação de string
- Rate limiting nas rotas `/api/telemetry/*`: 1000 req/min por project_id
- Headers de resposta: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`

## 7. Padrões de API

```typescript
// Resposta de sucesso
{ data: T, meta?: { total: number, page: number } }

// Resposta de erro
{ error: { code: string, message: string, details?: unknown } }

// Códigos de erro padronizados
INVALID_API_KEY, QUOTA_EXCEEDED, INVALID_PAYLOAD, INTERNAL_ERROR
```

## 8. Padrões de Banco de Dados

### ClickHouse
- Sempre filtrar por `project_id` primeiro (está no ORDER BY)
- Usar as Materialized Views (`service_span_stats`, `service_log_stats`) para queries de dashboard
- TTL: traces 90d, logs 60d, metrics 120d — não alterar sem aprovação

### Neon/PostgreSQL
- Usar o schema `hack_tech_farm` como namespace
- Connection pooling: sempre usar a URL com PgBouncer (`DATABASE_URL_POOLED`)
- Migrations: arquivos numerados em `infra/neon/`
- UUIDs: `gen_random_uuid()` (sem uuid-ossp)

## 9. Fase Atual do Projeto

**Fase 1 (Semanas 1–3): Fundação de Ingestão**
- [ ] Schema ClickHouse + Neon criados
- [ ] `/api/telemetry/traces` — endpoint OTLP/HTTP
- [ ] Validação de API key
- [ ] `test-telemetry.ts` — smoke test

**Fase 2 (Semanas 4–6): Core do Dashboard** ← Próxima
- [ ] Service Health Overview com dados mockados
- [ ] Trace Explorer paginado
- [ ] Error Dashboard com drill-down

**Fase 3 (Semanas 7–9): Camada de IA**
- [ ] Integração Haiku para triagem
- [ ] RCA com Sonnet (assíncrono)
- [ ] Anomaly detection (z-score)

**Fase 4 (Semanas 10–12): Polimento e GTM**
- [ ] Onboarding wizard (Vercel/Supabase em 3 cliques)
- [ ] Alertas com email + Slack webhook
- [ ] Trial 14 dias sem cartão

## 10. Variáveis de Ambiente Necessárias

```bash
# Neon (PostgreSQL)
DATABASE_URL=postgresql://...@ep-xxx.us-east-2.aws.neon.tech/hackfarm?sslmode=require
DATABASE_URL_POOLED=postgresql://...@ep-xxx-pooler.us-east-2.aws.neon.tech/hackfarm

# ClickHouse (Railway)
CLICKHOUSE_URL=https://xxx.up.railway.app
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=xxx
CLICKHOUSE_DATABASE=hackfarm_observability

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Auth
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Pusher (WebSocket)
PUSHER_APP_ID=xxx
PUSHER_KEY=xxx
PUSHER_SECRET=xxx
PUSHER_CLUSTER=sa1
NEXT_PUBLIC_PUSHER_KEY=xxx
NEXT_PUBLIC_PUSHER_CLUSTER=sa1
```
