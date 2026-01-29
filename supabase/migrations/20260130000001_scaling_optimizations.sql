-- PostgreSQL Scaling Optimizations
-- Based on OpenAI's PostgreSQL scaling practices

-- ============================================
-- STEP 1: Table Partitioning for Large Tables
-- ============================================

-- Partition invoices by date (quarterly partitions)
-- Note: This creates a new partitioned table structure

-- Create partitioned invoices table
CREATE TABLE IF NOT EXISTS invoices_partitioned (
    id text NOT NULL,
    organization_id text NOT NULL,
    invoice_number text NOT NULL,
    client_name text NOT NULL,
    client_email text NOT NULL,
    client_company text,
    client_tin text,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    subtotal numeric(15,2) NOT NULL DEFAULT 0,
    tax_rate numeric(5,4) NOT NULL DEFAULT 0,
    tax_amount numeric(15,2) NOT NULL DEFAULT 0,
    total numeric(15,2) NOT NULL DEFAULT 0,
    status text NOT NULL,
    date timestamptz NOT NULL,
    due_date timestamptz NOT NULL,
    notes text,
    ownership_transfer jsonb,
    parent_invoice_id text,
    root_invoice_id text,
    transfer_sequence integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, date)
) PARTITION BY RANGE (date);

-- Create partitions for 2026
CREATE TABLE IF NOT EXISTS invoices_2026_q1 PARTITION OF invoices_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS invoices_2026_q2 PARTITION OF invoices_partitioned
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS invoices_2026_q3 PARTITION OF invoices_partitioned
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS invoices_2026_q4 PARTITION OF invoices_partitioned
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Create partitions for 2027
CREATE TABLE IF NOT EXISTS invoices_2027_q1 PARTITION OF invoices_partitioned
    FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS invoices_2027_q2 PARTITION OF invoices_partitioned
    FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');
CREATE TABLE IF NOT EXISTS invoices_2027_q3 PARTITION OF invoices_partitioned
    FOR VALUES FROM ('2027-07-01') TO ('2027-10-01');
CREATE TABLE IF NOT EXISTS invoices_2027_q4 PARTITION OF invoices_partitioned
    FOR VALUES FROM ('2027-10-01') TO ('2028-01-01');

-- Default partition for dates outside defined ranges
CREATE TABLE IF NOT EXISTS invoices_default PARTITION OF invoices_partitioned DEFAULT;

-- Partition payments by date (quarterly)
CREATE TABLE IF NOT EXISTS payments_partitioned (
    id text NOT NULL,
    invoice_id text NOT NULL,
    amount numeric(15,2) NOT NULL DEFAULT 0,
    currency text,
    status text,
    provider text,
    provider_reference text,
    platform_fee_percent numeric(5,4),
    platform_fee_amount numeric(15,2),
    net_amount numeric(15,2),
    date timestamptz NOT NULL,
    method text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, date)
) PARTITION BY RANGE (date);

-- Create payment partitions for 2026
CREATE TABLE IF NOT EXISTS payments_2026_q1 PARTITION OF payments_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS payments_2026_q2 PARTITION OF payments_partitioned
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS payments_2026_q3 PARTITION OF payments_partitioned
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS payments_2026_q4 PARTITION OF payments_partitioned
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Create payment partitions for 2027
CREATE TABLE IF NOT EXISTS payments_2027_q1 PARTITION OF payments_partitioned
    FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS payments_2027_q2 PARTITION OF payments_partitioned
    FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');
CREATE TABLE IF NOT EXISTS payments_2027_q3 PARTITION OF payments_partitioned
    FOR VALUES FROM ('2027-07-01') TO ('2027-10-01');
CREATE TABLE IF NOT EXISTS payments_2027_q4 PARTITION OF payments_partitioned
    FOR VALUES FROM ('2027-10-01') TO ('2028-01-01');

CREATE TABLE IF NOT EXISTS payments_default PARTITION OF payments_partitioned DEFAULT;

-- Partition agent_logs by timestamp (monthly for high-volume logs)
CREATE TABLE IF NOT EXISTS agent_logs_partitioned (
    id text NOT NULL,
    organization_id text NOT NULL,
    timestamp timestamptz NOT NULL,
    action text NOT NULL,
    details text NOT NULL,
    related_id text,
    type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create agent_logs partitions for 2026
CREATE TABLE IF NOT EXISTS agent_logs_2026_01 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_02 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_03 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_04 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_05 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_06 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_07 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_08 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_09 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_10 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_11 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS agent_logs_2026_12 PARTITION OF agent_logs_partitioned
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS agent_logs_default PARTITION OF agent_logs_partitioned DEFAULT;

-- ============================================
-- STEP 2: Covering Indexes for Hot Paths
-- ============================================

-- Invoice list view - avoid table lookups
CREATE INDEX IF NOT EXISTS idx_invoices_org_status_covering
ON invoices (organization_id, status)
INCLUDE (total, client_name, client_email, date, due_date, invoice_number);

-- Invoice dashboard summary - covers common aggregation queries
CREATE INDEX IF NOT EXISTS idx_invoices_org_date_covering
ON invoices (organization_id, date DESC)
INCLUDE (status, total, tax_amount);

-- Payment list with invoice lookup optimization
CREATE INDEX IF NOT EXISTS idx_payments_invoice_covering
ON payments (invoice_id)
INCLUDE (amount, status, method, date, provider);

-- Client lookup for invoice creation
CREATE INDEX IF NOT EXISTS idx_clients_org_covering
ON clients (organization_id, lower(email))
INCLUDE (name, company, phone);

-- Services catalog display
CREATE INDEX IF NOT EXISTS idx_services_org_covering
ON services (organization_id)
INCLUDE (name, price, category, description, is_active)
WHERE is_active = true;

-- Expense tracking view
CREATE INDEX IF NOT EXISTS idx_expenses_org_status_covering
ON expenses (organization_id, status)
INCLUDE (total, vendor_name, date, expense_number);

-- Org membership lookup with role info
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_covering
ON org_memberships (user_id)
INCLUDE (organization_id, role, permissions);

-- ============================================
-- STEP 3: Aggressive Autovacuum Settings
-- ============================================

-- High-churn tables need more aggressive vacuum
ALTER TABLE payments SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE agent_logs SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01,
    autovacuum_vacuum_cost_delay = 5
);

ALTER TABLE invoices SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE expenses SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

-- Session/lookup tables - moderate settings
ALTER TABLE users SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE organizations SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- ============================================
-- STEP 4: Materialized Views for Dashboard
-- ============================================

-- Organization revenue summary (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_org_revenue_summary AS
SELECT
    i.organization_id,
    date_trunc('month', i.date) AS month,
    COUNT(*) AS invoice_count,
    COUNT(*) FILTER (WHERE i.status = 'PAID') AS paid_count,
    COUNT(*) FILTER (WHERE i.status = 'PENDING' OR i.status = 'SENT') AS pending_count,
    COUNT(*) FILTER (WHERE i.status = 'OVERDUE') AS overdue_count,
    SUM(i.total) AS total_invoiced,
    SUM(i.total) FILTER (WHERE i.status = 'PAID') AS total_collected,
    SUM(i.total) FILTER (WHERE i.status = 'PENDING' OR i.status = 'SENT') AS total_pending,
    SUM(i.total) FILTER (WHERE i.status = 'OVERDUE') AS total_overdue,
    AVG(i.total) AS avg_invoice_amount
FROM invoices i
GROUP BY i.organization_id, date_trunc('month', i.date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_org_revenue_summary
ON mv_org_revenue_summary (organization_id, month);

-- Organization expense summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_org_expense_summary AS
SELECT
    e.organization_id,
    date_trunc('month', e.date) AS month,
    COUNT(*) AS expense_count,
    SUM(e.total) AS total_expenses,
    SUM(e.total) FILTER (WHERE e.status = 'PAID') AS total_paid,
    SUM(e.total) FILTER (WHERE e.status = 'PENDING') AS total_pending,
    e.category,
    COUNT(*) AS category_count,
    SUM(e.total) AS category_total
FROM expenses e
GROUP BY e.organization_id, date_trunc('month', e.date), e.category;

CREATE INDEX IF NOT EXISTS idx_mv_org_expense_summary
ON mv_org_expense_summary (organization_id, month);

-- Payment analytics view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_payment_analytics AS
SELECT
    p.invoice_id,
    i.organization_id,
    date_trunc('day', p.date) AS payment_date,
    p.provider,
    p.method,
    COUNT(*) AS payment_count,
    SUM(p.amount) AS total_amount,
    SUM(p.platform_fee_amount) AS total_fees,
    SUM(p.net_amount) AS total_net,
    AVG(p.amount) AS avg_payment
FROM payments p
JOIN invoices i ON i.id = p.invoice_id
WHERE p.status = 'COMPLETED'
GROUP BY p.invoice_id, i.organization_id, date_trunc('day', p.date), p.provider, p.method;

CREATE INDEX IF NOT EXISTS idx_mv_payment_analytics_org
ON mv_payment_analytics (organization_id, payment_date DESC);

-- Client activity summary (aggregates by email, takes most recent name/company)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_activity AS
SELECT
    i.organization_id,
    lower(i.client_email) AS client_email,
    (array_agg(i.client_name ORDER BY i.date DESC))[1] AS client_name,
    (array_agg(i.client_company ORDER BY i.date DESC))[1] AS client_company,
    COUNT(*) AS total_invoices,
    COUNT(*) FILTER (WHERE i.status = 'PAID') AS paid_invoices,
    SUM(i.total) AS lifetime_value,
    SUM(i.total) FILTER (WHERE i.status = 'PAID') AS total_paid,
    MAX(i.date) AS last_invoice_date,
    MIN(i.date) AS first_invoice_date
FROM invoices i
GROUP BY i.organization_id, lower(i.client_email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_client_activity
ON mv_client_activity (organization_id, client_email);

-- ============================================
-- STEP 5: Function to Refresh Materialized Views
-- ============================================

CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_revenue_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_expense_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_payment_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_activity;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_dashboard_views() TO authenticated;

-- ============================================
-- STEP 6: Indexes on Partitioned Tables
-- ============================================

-- Indexes for partitioned invoices
CREATE INDEX IF NOT EXISTS idx_invoices_part_org_id ON invoices_partitioned (organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_part_org_status ON invoices_partitioned (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_part_org_date ON invoices_partitioned (organization_id, date DESC);

-- Indexes for partitioned payments
CREATE INDEX IF NOT EXISTS idx_payments_part_invoice ON payments_partitioned (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_part_date ON payments_partitioned (date DESC);

-- Indexes for partitioned agent_logs
CREATE INDEX IF NOT EXISTS idx_agent_logs_part_org ON agent_logs_partitioned (organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_part_org_ts ON agent_logs_partitioned (organization_id, timestamp DESC);

-- ============================================
-- STEP 7: Statistics Targets for Better Plans
-- ============================================

-- Increase statistics for frequently filtered columns
ALTER TABLE invoices ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE invoices ALTER COLUMN organization_id SET STATISTICS 1000;
ALTER TABLE payments ALTER COLUMN status SET STATISTICS 500;
ALTER TABLE payments ALTER COLUMN provider SET STATISTICS 500;

-- ============================================
-- STEP 8: Comments for Documentation
-- ============================================

COMMENT ON MATERIALIZED VIEW mv_org_revenue_summary IS
'Pre-aggregated monthly revenue metrics per organization. Refresh with refresh_dashboard_views()';

COMMENT ON MATERIALIZED VIEW mv_org_expense_summary IS
'Pre-aggregated monthly expense metrics per organization by category';

COMMENT ON MATERIALIZED VIEW mv_payment_analytics IS
'Daily payment analytics by provider and method';

COMMENT ON MATERIALIZED VIEW mv_client_activity IS
'Client lifetime value and activity summary per organization';

COMMENT ON FUNCTION refresh_dashboard_views IS
'Refreshes all dashboard materialized views concurrently. Call periodically via cron or after batch updates.';
