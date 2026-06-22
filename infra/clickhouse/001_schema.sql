-- ============================================================================
-- Health-System-IA: Schema ClickHouse (OLAP)
-- Banco: hackfarm_observability
-- Motor: MergeTree com particionamento mensal
-- Retenção: traces 90d | logs 60d | metrics 120d
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hackfarm_observability;

-- ----------------------------------------------------------------------------
-- TRACES / SPANS (OpenTelemetry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackfarm_observability.otel_traces
(
    trace_id          FixedString(32)                    COMMENT 'Hex ID do trace (128-bit)',
    span_id           FixedString(16)                    COMMENT 'Hex ID do span (64-bit)',
    parent_span_id    FixedString(16)                    COMMENT 'Hex ID do span pai (vazio = root)',
    project_id        UInt32                             COMMENT 'FK para projects.clickhouse_project_id no Neon',
    service_name      LowCardinality(String)             COMMENT 'Nome do serviço instrumentado',
    service_namespace LowCardinality(String)             COMMENT 'Namespace/ambiente do serviço',
    span_name         LowCardinality(String)             COMMENT 'Operação: GET /api/users, db.query, etc',
    span_kind         LowCardinality(String)             COMMENT 'server | client | producer | consumer | internal',
    start_time        DateTime64(6)                      COMMENT 'Início em microssegundos (UTC)',
    end_time          DateTime64(6)                      COMMENT 'Fim em microssegundos (UTC)',
    duration_us       UInt64                             COMMENT 'Duração em microssegundos',
    status_code       LowCardinality(String)             COMMENT 'UNSET | OK | ERROR',
    status_message    String                             COMMENT 'Mensagem de erro quando status=ERROR',
    attributes        Map(LowCardinality(String), String) COMMENT 'Atributos OTel (http.method, db.statement, etc)',
    events Nested(
        event_name       String,
        event_time       DateTime64(6),
        event_attributes Map(LowCardinality(String), String)
    )                                                    COMMENT 'Eventos do span (exception, log, etc)',
    links Nested(
        linked_trace_id  FixedString(32),
        linked_span_id   FixedString(16),
        link_attributes  Map(LowCardinality(String), String)
    )                                                    COMMENT 'Links para outros traces (ex: mensagens async)',
    trace_state       String                             COMMENT 'W3C Trace Context trace-state',
    ts_date           Date DEFAULT toDate(start_time),
    _ingestion_time   DateTime64(6) DEFAULT now64(6)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts_date)
ORDER BY (project_id, service_name, span_name, status_code, start_time)
TTL start_time + INTERVAL 90 DAY
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

-- Índices secundários para lookups por ID e filtros de dashboard
ALTER TABLE hackfarm_observability.otel_traces
    ADD INDEX IF NOT EXISTS idx_trace_id      trace_id      TYPE bloom_filter() GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_span_id       span_id       TYPE bloom_filter() GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_parent_span   parent_span_id TYPE bloom_filter() GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_duration      duration_us   TYPE minmax GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_svc_name      service_name  TYPE bloom_filter() GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_status        status_code   TYPE set(100) GRANULARITY 4;

-- ----------------------------------------------------------------------------
-- LOGS (OpenTelemetry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackfarm_observability.otel_logs
(
    trace_id           FixedString(32)                    COMMENT 'Trace correlacionado (pode ser vazio)',
    span_id            FixedString(16)                    COMMENT 'Span correlacionado (pode ser vazio)',
    log_id             UUID                               COMMENT 'ID único do registro de log',
    project_id         UInt32                             COMMENT 'FK projeto',
    service_name       LowCardinality(String),
    service_version    LowCardinality(String),
    severity_text      LowCardinality(String)             COMMENT 'TRACE|DEBUG|INFO|WARN|ERROR|FATAL',
    severity_number    UInt8                              COMMENT 'OTel severity number 1–24',
    body               String                             COMMENT 'Corpo da mensagem (PII já mascarado pelo Vector)',
    attributes         Map(LowCardinality(String), String),
    resource_attributes Map(LowCardinality(String), String),
    scope_name         LowCardinality(String),
    scope_version      String,
    timestamp          DateTime64(6),
    ts_date            Date DEFAULT toDate(timestamp),
    _ingestion_time    DateTime64(6) DEFAULT now64(6)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts_date)
ORDER BY (project_id, service_name, severity_text, timestamp)
TTL timestamp + INTERVAL 60 DAY
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

ALTER TABLE hackfarm_observability.otel_logs
    ADD INDEX IF NOT EXISTS idx_logs_trace    trace_id      TYPE bloom_filter() GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_logs_span     span_id       TYPE bloom_filter() GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_logs_severity severity_text TYPE set(10) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_logs_body     body          TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_logs_ts       timestamp     TYPE minmax GRANULARITY 4;

-- ----------------------------------------------------------------------------
-- MÉTRICAS (OpenTelemetry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackfarm_observability.otel_metrics
(
    project_id          UInt32,
    service_name        LowCardinality(String),
    metric_name         LowCardinality(String)            COMMENT 'Ex: http.server.duration, process.cpu.usage',
    metric_type         LowCardinality(String)            COMMENT 'gauge | sum | histogram | summary',
    metric_unit         LowCardinality(String)            COMMENT 'ms | bytes | requests | 1 (adimensional)',
    metric_description  String,
    value_double        Nullable(Float64)                 COMMENT 'Valor gauge/sum em double',
    value_int64         Nullable(Int64)                   COMMENT 'Valor gauge/sum em int',
    count               Nullable(UInt64)                  COMMENT 'Contagem histogram/summary',
    sum_value           Nullable(Float64),
    min_value           Nullable(Float64),
    max_value           Nullable(Float64),
    bucket_bounds       Array(Float64)                    COMMENT 'Limites dos buckets do histogram',
    bucket_counts       Array(UInt64),
    quantile_values     Array(Float64),
    attributes          Map(LowCardinality(String), String),
    resource_attributes Map(LowCardinality(String), String),
    timestamp           DateTime64(6),
    ts_date             Date DEFAULT toDate(timestamp),
    _ingestion_time     DateTime64(6) DEFAULT now64(6)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts_date)
ORDER BY (project_id, service_name, metric_name, metric_type, timestamp)
TTL timestamp + INTERVAL 120 DAY
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

ALTER TABLE hackfarm_observability.otel_metrics
    ADD INDEX IF NOT EXISTS idx_met_project  project_id  TYPE minmax GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_met_service  service_name TYPE bloom_filter() GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_met_name     metric_name  TYPE bloom_filter() GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_met_ts       timestamp    TYPE minmax GRANULARITY 4;

-- ============================================================================
-- MATERIALIZED VIEWS — Pré-agregação para dashboard (sem full scan)
-- ============================================================================

-- Destino: agregação de spans por serviço/dia
CREATE TABLE IF NOT EXISTS hackfarm_observability.service_span_stats
(
    project_id      UInt32,
    service_name    LowCardinality(String),
    span_name       LowCardinality(String),
    status_code     LowCardinality(String),
    day             Date,
    total_spans     UInt64,
    error_count     UInt64,
    avg_duration_us AggregateFunction(avg, UInt64),
    p95_duration_us AggregateFunction(quantile(0.95), UInt64),
    p99_duration_us AggregateFunction(quantile(0.99), UInt64)
)
ENGINE = SummingMergeTree()
ORDER BY (project_id, service_name, span_name, status_code, day);

CREATE MATERIALIZED VIEW IF NOT EXISTS hackfarm_observability.mv_service_span_stats
TO hackfarm_observability.service_span_stats AS
SELECT
    project_id,
    service_name,
    span_name,
    status_code,
    toDate(start_time)         AS day,
    count()                    AS total_spans,
    countIf(status_code = 'ERROR') AS error_count,
    avgState(duration_us)      AS avg_duration_us,
    quantileState(0.95)(duration_us) AS p95_duration_us,
    quantileState(0.99)(duration_us) AS p99_duration_us
FROM hackfarm_observability.otel_traces
GROUP BY project_id, service_name, span_name, status_code, day;

-- Destino: agregação de logs por severidade/dia
CREATE TABLE IF NOT EXISTS hackfarm_observability.service_log_stats
(
    project_id    UInt32,
    service_name  LowCardinality(String),
    severity_text LowCardinality(String),
    day           Date,
    total_logs    UInt64
)
ENGINE = SummingMergeTree()
ORDER BY (project_id, service_name, severity_text, day);

CREATE MATERIALIZED VIEW IF NOT EXISTS hackfarm_observability.mv_service_log_stats
TO hackfarm_observability.service_log_stats AS
SELECT
    project_id,
    service_name,
    severity_text,
    toDate(timestamp) AS day,
    count()           AS total_logs
FROM hackfarm_observability.otel_logs
GROUP BY project_id, service_name, severity_text, day;

-- Destino: agregação de métricas por hora
CREATE TABLE IF NOT EXISTS hackfarm_observability.service_metric_stats
(
    project_id   UInt32,
    service_name LowCardinality(String),
    metric_name  LowCardinality(String),
    metric_type  LowCardinality(String),
    hour         DateTime,
    avg_value    AggregateFunction(avg, Float64),
    max_value    AggregateFunction(max, Float64),
    min_value    AggregateFunction(min, Float64)
)
ENGINE = SummingMergeTree()
ORDER BY (project_id, service_name, metric_name, metric_type, hour);

CREATE MATERIALIZED VIEW IF NOT EXISTS hackfarm_observability.mv_service_metric_stats
TO hackfarm_observability.service_metric_stats AS
SELECT
    project_id,
    service_name,
    metric_name,
    metric_type,
    toStartOfHour(timestamp) AS hour,
    avgState(value_double)   AS avg_value,
    maxState(value_double)   AS max_value,
    minState(value_double)   AS min_value
FROM hackfarm_observability.otel_metrics
WHERE value_double IS NOT NULL
GROUP BY project_id, service_name, metric_name, metric_type, hour;

-- ============================================================================
-- VIEW: Dashboard query helper — últimas 24h por projeto
-- ============================================================================
CREATE OR REPLACE VIEW hackfarm_observability.v_service_health_24h AS
SELECT
    s.project_id,
    s.service_name,
    sumMerge(s.total_spans)                    AS total_spans_24h,
    sumMerge(s.error_count)                    AS error_count_24h,
    round(sumMerge(s.error_count) * 100.0 /
          nullIf(sumMerge(s.total_spans), 0), 2) AS error_rate_pct,
    round(avgMerge(s.avg_duration_us) / 1000, 2) AS avg_latency_ms,
    round(quantileMerge(0.95)(s.p95_duration_us) / 1000, 2) AS p95_latency_ms,
    round(quantileMerge(0.99)(s.p99_duration_us) / 1000, 2) AS p99_latency_ms
FROM hackfarm_observability.service_span_stats s
WHERE s.day >= toDate(now() - INTERVAL 1 DAY)
GROUP BY s.project_id, s.service_name;
