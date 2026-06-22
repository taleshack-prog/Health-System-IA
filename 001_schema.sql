-- ============================================================================
-- Health-System-IA: Schema PostgreSQL (OLTP)
-- Banco: Neon (PostgreSQL 16 serverless)
-- Schema: hack_tech_farm
-- ============================================================================
-- INSTRUÇÕES NEON:
--   1. Execute com a URL pooled para migrações longas:
--      psql $DATABASE_URL_POOLED -f 001_schema.sql
--   2. Para dev: crie um branch no console Neon antes de rodar
--   3. Pooling mode: sempre 'Transaction' (não 'Session') para compatibilidade
-- ============================================================================

-- Schema namespace isolado
CREATE SCHEMA IF NOT EXISTS hack_tech_farm;
SET search_path TO hack_tech_farm, public;

-- Extensões necessárias (disponíveis no Neon)
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid(), crypt()
-- NÃO usar uuid-ossp no Neon — gen_random_uuid() é nativo

-- ============================================================================
-- TIERS / PLANOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tiers (
    id                           SERIAL PRIMARY KEY,
    name                         VARCHAR(50)   NOT NULL UNIQUE,
    code                         VARCHAR(50)   NOT NULL UNIQUE,
    description                  TEXT,
    max_projects                 INTEGER       NOT NULL DEFAULT 1,
    max_users                    INTEGER       NOT NULL DEFAULT 1,
    retention_days               INTEGER       NOT NULL DEFAULT 30,
    max_monthly_logs             BIGINT        NOT NULL DEFAULT 1000000,
    max_monthly_spans            BIGINT        NOT NULL DEFAULT 500000,
    max_monthly_metrics          BIGINT        NOT NULL DEFAULT 1000000,
    ai_rca_enabled               BOOLEAN       NOT NULL DEFAULT FALSE,
    ai_anomaly_detection_enabled BOOLEAN       NOT NULL DEFAULT FALSE,
    price_cents                  INTEGER       NOT NULL DEFAULT 0,
    currency                     VARCHAR(3)    NOT NULL DEFAULT 'BRL',
    is_active                    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ORGANIZAÇÕES (multi-tenant root)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255)  NOT NULL,
    slug          VARCHAR(255)  NOT NULL UNIQUE,
    billing_email VARCHAR(255),
    tier_id       INTEGER       NOT NULL REFERENCES tiers(id) ON DELETE RESTRICT,
    trial_ends_at TIMESTAMPTZ,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    metadata      JSONB         NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orgs_tier_id ON organizations(tier_id);
CREATE INDEX IF NOT EXISTS idx_orgs_slug    ON organizations(slug);

-- ============================================================================
-- USUÁRIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255),              -- NULL quando auth OAuth
    full_name         VARCHAR(255) NOT NULL,
    avatar_url        VARCHAR(1024),
    github_id         VARCHAR(50)  UNIQUE,       -- OAuth GitHub
    is_superadmin     BOOLEAN      NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    last_login_at     TIMESTAMPTZ,
    preferences       JSONB        NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id) WHERE github_id IS NOT NULL;

-- ============================================================================
-- MEMBROS DA ORGANIZAÇÃO (RBAC: owner > admin > member > viewer)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id  ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

-- ============================================================================
-- PROJETOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                  VARCHAR(255) NOT NULL,
    slug                  VARCHAR(255) NOT NULL,
    description           TEXT,
    -- ID numérico usado como chave de particionamento no ClickHouse (UInt32)
    clickhouse_project_id INTEGER      NOT NULL UNIQUE,
    -- Hash da API key de ingestão (comparar com crypto.timingSafeEqual)
    api_key_hash          VARCHAR(255) NOT NULL UNIQUE,
    settings              JSONB        NOT NULL DEFAULT '{}',
    labels                JSONB        NOT NULL DEFAULT '[]',
    is_archived           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_projects_org_id      ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug        ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_ch_id       ON projects(clickhouse_project_id);

-- ============================================================================
-- SERVIÇOS REGISTRADOS POR PROJETO
-- (populado automaticamente no primeiro span recebido de um serviço novo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_services (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    language      VARCHAR(50),
    environment   VARCHAR(50)  NOT NULL DEFAULT 'production',
    first_seen_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_seen_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    metadata      JSONB        NOT NULL DEFAULT '{}',
    UNIQUE (project_id, name, environment)
);
CREATE INDEX IF NOT EXISTS idx_project_services_project_id ON project_services(project_id);

-- ============================================================================
-- ALERTAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS alerts (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    source_type      VARCHAR(20) NOT NULL
                     CHECK (source_type IN ('trace', 'log', 'metric', 'ai_anomaly')),
    severity         VARCHAR(20) NOT NULL
                     CHECK (severity IN ('critical', 'warning', 'info')),
    -- JSON com a configuração da regra: threshold, janela, métrica, etc.
    condition_config JSONB       NOT NULL DEFAULT '{}',
    status           VARCHAR(20) NOT NULL DEFAULT 'firing'
                     CHECK (status IN ('firing', 'acknowledged', 'resolved', 'suppressed')),
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at  TIMESTAMPTZ,
    acknowledged_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
    resolved_at      TIMESTAMPTZ,
    resolved_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
    -- Dados da ocorrência: trace_id, span_id, metric_name, etc.
    payload          JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_project_id  ON alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status      ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity    ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_started_at  ON alerts(started_at DESC);
-- Lookup por trace_id no payload (diagnósticos de IA cruzam com alertas)
CREATE INDEX IF NOT EXISTS idx_alerts_trace_id
    ON alerts((payload->>'trace_id'))
    WHERE payload->>'trace_id' IS NOT NULL;

-- ============================================================================
-- DIAGNÓSTICOS DE IA / RCA (Root Cause Analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_diagnoses (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       UUID           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    alert_id         UUID           REFERENCES alerts(id) ON DELETE SET NULL,
    triggered_by     VARCHAR(20)    NOT NULL
                     CHECK (triggered_by IN ('alert', 'manual', 'scheduled', 'anomaly')),
    status           VARCHAR(20)    NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running', 'completed', 'failed', 'superseded')),
    title            VARCHAR(500),
    summary          TEXT,
    root_cause       TEXT,
    impact_analysis  TEXT,
    -- Array de recomendações: [{ "action": "...", "priority": "high", "effort": "low" }]
    recommendations  JSONB          NOT NULL DEFAULT '[]',
    -- Evidências usadas pela IA: trace_ids, log_ids, métricas
    evidence         JSONB          NOT NULL DEFAULT '[]',
    confidence_score DECIMAL(4,3)   CHECK (confidence_score BETWEEN 0.000 AND 1.000),
    model_version    VARCHAR(50),   -- 'claude-haiku-3-5' | 'claude-sonnet-4-5'
    tokens_used      INTEGER,
    started_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_diag_project_id  ON ai_diagnoses(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_diag_alert_id    ON ai_diagnoses(alert_id);
CREATE INDEX IF NOT EXISTS idx_ai_diag_status      ON ai_diagnoses(status);
CREATE INDEX IF NOT EXISTS idx_ai_diag_started_at  ON ai_diagnoses(started_at DESC);
-- GIN para busca dentro do array de trace_ids na evidência
CREATE INDEX IF NOT EXISTS idx_ai_diag_evidence_traces
    ON ai_diagnoses USING GIN ((evidence->'trace_ids'));

-- ============================================================================
-- ANOMALIAS DETECTADAS POR IA
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_anomalies (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    service_name    VARCHAR(255),
    metric_name     VARCHAR(255),
    anomaly_type    VARCHAR(20)   NOT NULL
                    CHECK (anomaly_type IN ('spike', 'drop', 'trend_change', 'pattern_break')),
    severity        VARCHAR(20)   NOT NULL
                    CHECK (severity IN ('critical', 'warning', 'info')),
    detected_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    window_start    TIMESTAMPTZ   NOT NULL,
    window_end      TIMESTAMPTZ   NOT NULL,
    expected_value  DOUBLE PRECISION,
    actual_value    DOUBLE PRECISION,
    deviation_score DOUBLE PRECISION,   -- z-score
    model_version   VARCHAR(50),
    status          VARCHAR(20)   NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    ai_diagnosis_id UUID          REFERENCES ai_diagnoses(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anomalies_project_id  ON ai_anomalies(project_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_service     ON ai_anomalies(service_name);
CREATE INDEX IF NOT EXISTS idx_anomalies_metric      ON ai_anomalies(metric_name);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON ai_anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_status      ON ai_anomalies(status);

-- ============================================================================
-- DASHBOARDS CUSTOMIZADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboards (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID         REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    -- Array de widgets com posição e configuração
    layout_config   JSONB        NOT NULL DEFAULT '[]',
    is_default      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_shared       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dashboards_project_id      ON dashboards(project_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_organization_id ON dashboards(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_created_by      ON dashboards(created_by);

-- ============================================================================
-- QUOTAS DE USO (billing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_quotas (
    id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id         UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    period_start       DATE    NOT NULL,
    period_end         DATE    NOT NULL,
    logs_count         BIGINT  NOT NULL DEFAULT 0,
    spans_count        BIGINT  NOT NULL DEFAULT 0,
    metrics_count      BIGINT  NOT NULL DEFAULT 0,
    storage_bytes      BIGINT  NOT NULL DEFAULT 0,
    ai_diagnoses_count INTEGER NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_usage_project_id ON usage_quotas(project_id);
CREATE INDEX IF NOT EXISTS idx_usage_period     ON usage_quotas(period_start, period_end);

-- ============================================================================
-- AUDIT LOGS — particionado por mês
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID         REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID         REFERENCES organizations(id) ON DELETE SET NULL,
    project_id      UUID         REFERENCES projects(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,  -- 'project.created', 'alert.acknowledged', etc.
    entity_type     VARCHAR(50)  NOT NULL,
    entity_id       VARCHAR(255) NOT NULL,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Partições por mês (criar mensalmente — automatizar via cron job)
CREATE TABLE IF NOT EXISTS audit_logs_2025_01
    PARTITION OF audit_logs FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS audit_logs_2025_06
    PARTITION OF audit_logs FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS audit_logs_2026_01
    PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS audit_logs_2026_06
    PARTITION OF audit_logs FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS audit_logs_2026_07
    PARTITION OF audit_logs FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE INDEX IF NOT EXISTS idx_audit_actor_id  ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_org_id    ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_project   ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_logs(created_at DESC);

-- ============================================================================
-- TRIGGER: updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'hack_tech_farm'
    LOOP
        EXECUTE format(
            'CREATE OR REPLACE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON hack_tech_farm.%I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            t, t
        );
    END LOOP;
END $$;

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================
INSERT INTO tiers (
    name, code, description,
    max_projects, max_users, retention_days,
    max_monthly_logs, max_monthly_spans, max_monthly_metrics,
    ai_rca_enabled, ai_anomaly_detection_enabled,
    price_cents, currency
) VALUES
(
    'Starter', 'starter',
    'Ideal para indie devs e pequenos times brasileiros',
    3, 10, 30, 1000000, 500000, 1000000,
    FALSE, TRUE, 4900, 'BRL'
),
(
    'Pro', 'pro',
    'Observabilidade completa com diagnóstico de IA assistida',
    10, 50, 90, 10000000, 5000000, 10000000,
    TRUE, TRUE, 12900, 'BRL'
),
(
    'Enterprise', 'enterprise',
    'Volumetria ilimitada, SLA dedicado e suporte em PT-BR',
    999, 999, 365,
    9223372036854775807, 9223372036854775807, 9223372036854775807,
    TRUE, TRUE, 0, 'BRL'
)
ON CONFLICT (code) DO NOTHING;
