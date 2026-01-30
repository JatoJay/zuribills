-- Partial Payments and Payment Schedules
-- Enables customers to pay invoices in installments

-- ============================================
-- STEP 1: Add partial payment columns to invoices
-- ============================================

-- Add amount_paid to track total payments received
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid numeric(15,2) NOT NULL DEFAULT 0;

-- Add generated balance column (auto-calculated)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance numeric(15,2)
    GENERATED ALWAYS AS (total - amount_paid) STORED;

-- Add payment terms for installment plans
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms jsonb;
-- payment_terms structure:
-- {
--   "type": "full" | "installment",
--   "installments": 3,
--   "frequency": "weekly" | "biweekly" | "monthly",
--   "deposit_percent": 30,
--   "deposit_amount": 150.00
-- }

-- ============================================
-- STEP 2: Update invoice status to include PARTIAL_PAID
-- ============================================

-- Add PARTIAL_PAID to allowed statuses (using check constraint approach for flexibility)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('DRAFT', 'PENDING', 'SENT', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'));

-- ============================================
-- STEP 3: Create payment_schedules table
-- ============================================

CREATE TABLE IF NOT EXISTS payment_schedules (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    invoice_id text NOT NULL,
    schedule_number integer NOT NULL DEFAULT 1,
    amount numeric(15,2) NOT NULL,
    due_date timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'PENDING',
    paid_at timestamptz,
    payment_id text,
    reminder_sent_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT payment_schedules_invoice_fkey
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT payment_schedules_payment_fkey
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    CONSTRAINT payment_schedules_status_check
        CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
    CONSTRAINT payment_schedules_amount_positive
        CHECK (amount > 0),
    UNIQUE (invoice_id, schedule_number)
);

-- Enable RLS
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Add indexes for payment_schedules
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payment_schedules_invoice ON payment_schedules (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules (due_date) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules (status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_overdue ON payment_schedules (due_date, status)
    WHERE status = 'PENDING';

-- Covering index for schedule list view
CREATE INDEX IF NOT EXISTS idx_payment_schedules_covering
ON payment_schedules (invoice_id, due_date)
INCLUDE (amount, status, schedule_number, paid_at);

-- ============================================
-- STEP 5: Add updated_at trigger
-- ============================================

DROP TRIGGER IF EXISTS payment_schedules_updated_at ON payment_schedules;
CREATE TRIGGER payment_schedules_updated_at
    BEFORE UPDATE ON payment_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STEP 6: RLS Policies for payment_schedules
-- ============================================

-- Select: can view if member of invoice's organization
DROP POLICY IF EXISTS payment_schedules_select ON payment_schedules;
CREATE POLICY payment_schedules_select ON payment_schedules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_id
            AND (public.is_org_member(i.organization_id) OR public.is_catalog_org(i.organization_id))
        )
    );

-- Insert: can create if member of invoice's organization
DROP POLICY IF EXISTS payment_schedules_insert ON payment_schedules;
CREATE POLICY payment_schedules_insert ON payment_schedules
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_id
            AND public.is_org_member(i.organization_id)
        )
    );

-- Update: can update if member of invoice's organization
DROP POLICY IF EXISTS payment_schedules_update ON payment_schedules;
CREATE POLICY payment_schedules_update ON payment_schedules
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_id
            AND public.is_org_member(i.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_id
            AND public.is_org_member(i.organization_id)
        )
    );

-- Delete: can delete if member of invoice's organization
DROP POLICY IF EXISTS payment_schedules_delete ON payment_schedules;
CREATE POLICY payment_schedules_delete ON payment_schedules
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_id
            AND public.is_org_member(i.organization_id)
        )
    );

-- ============================================
-- STEP 7: Function to update invoice on payment
-- ============================================

CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invoice_total numeric(15,2);
    new_amount_paid numeric(15,2);
BEGIN
    -- Only process completed payments
    IF NEW.status != 'COMPLETED' THEN
        RETURN NEW;
    END IF;

    -- Get current invoice total
    SELECT total INTO invoice_total
    FROM invoices
    WHERE id = NEW.invoice_id;

    -- Calculate new amount paid
    SELECT COALESCE(SUM(amount), 0) INTO new_amount_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id
    AND status = 'COMPLETED';

    -- Update invoice amount_paid and status
    UPDATE invoices
    SET
        amount_paid = new_amount_paid,
        status = CASE
            WHEN new_amount_paid >= total THEN 'PAID'
            WHEN new_amount_paid > 0 THEN 'PARTIAL_PAID'
            ELSE status
        END
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$;

-- Create trigger on payments
DROP TRIGGER IF EXISTS payments_update_invoice ON payments;
CREATE TRIGGER payments_update_invoice
    AFTER INSERT OR UPDATE OF status, amount ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_on_payment();

-- ============================================
-- STEP 8: Function to link payment to schedule
-- ============================================

CREATE OR REPLACE FUNCTION link_payment_to_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only process completed payments
    IF NEW.status != 'COMPLETED' THEN
        RETURN NEW;
    END IF;

    -- Find and update the oldest pending schedule for this invoice
    UPDATE payment_schedules
    SET
        status = 'PAID',
        paid_at = NEW.date,
        payment_id = NEW.id
    WHERE id = (
        SELECT id
        FROM payment_schedules
        WHERE invoice_id = NEW.invoice_id
        AND status = 'PENDING'
        ORDER BY due_date ASC, schedule_number ASC
        LIMIT 1
    );

    RETURN NEW;
END;
$$;

-- Create trigger to auto-link payments to schedules
DROP TRIGGER IF EXISTS payments_link_schedule ON payments;
CREATE TRIGGER payments_link_schedule
    AFTER INSERT OR UPDATE OF status ON payments
    FOR EACH ROW
    EXECUTE FUNCTION link_payment_to_schedule();

-- ============================================
-- STEP 9: Function to mark overdue schedules
-- ============================================

CREATE OR REPLACE FUNCTION mark_overdue_schedules()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE payment_schedules
    SET status = 'OVERDUE'
    WHERE status = 'PENDING'
    AND due_date < now();

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- ============================================
-- STEP 10: Function to generate payment schedule
-- ============================================

CREATE OR REPLACE FUNCTION generate_payment_schedule(
    p_invoice_id text,
    p_installments integer,
    p_frequency text DEFAULT 'monthly',
    p_deposit_percent numeric DEFAULT 0,
    p_start_date timestamptz DEFAULT now()
)
RETURNS SETOF payment_schedules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total numeric(15,2);
    v_deposit_amount numeric(15,2);
    v_remaining numeric(15,2);
    v_installment_amount numeric(15,2);
    v_interval interval;
    v_current_date timestamptz;
    v_schedule_num integer := 1;
    v_record payment_schedules%ROWTYPE;
BEGIN
    -- Get invoice total
    SELECT total INTO v_total
    FROM invoices
    WHERE id = p_invoice_id;

    IF v_total IS NULL THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;

    -- Calculate deposit
    v_deposit_amount := ROUND(v_total * p_deposit_percent / 100, 2);
    v_remaining := v_total - v_deposit_amount;

    -- Determine interval
    v_interval := CASE p_frequency
        WHEN 'weekly' THEN INTERVAL '1 week'
        WHEN 'biweekly' THEN INTERVAL '2 weeks'
        WHEN 'monthly' THEN INTERVAL '1 month'
        WHEN 'quarterly' THEN INTERVAL '3 months'
        ELSE INTERVAL '1 month'
    END;

    v_current_date := p_start_date;

    -- Delete existing schedules for this invoice
    DELETE FROM payment_schedules WHERE invoice_id = p_invoice_id;

    -- Create deposit schedule if applicable
    IF v_deposit_amount > 0 THEN
        INSERT INTO payment_schedules (invoice_id, schedule_number, amount, due_date, notes)
        VALUES (p_invoice_id, v_schedule_num, v_deposit_amount, v_current_date, 'Deposit')
        RETURNING * INTO v_record;
        RETURN NEXT v_record;

        v_schedule_num := v_schedule_num + 1;
        v_current_date := v_current_date + v_interval;
    END IF;

    -- Calculate installment amount
    v_installment_amount := ROUND(v_remaining / p_installments, 2);

    -- Create installment schedules
    FOR i IN 1..p_installments LOOP
        -- Last installment gets the remainder to handle rounding
        IF i = p_installments THEN
            v_installment_amount := v_remaining - (v_installment_amount * (p_installments - 1));
        END IF;

        INSERT INTO payment_schedules (invoice_id, schedule_number, amount, due_date, notes)
        VALUES (
            p_invoice_id,
            v_schedule_num,
            v_installment_amount,
            v_current_date,
            'Installment ' || i || ' of ' || p_installments
        )
        RETURNING * INTO v_record;
        RETURN NEXT v_record;

        v_schedule_num := v_schedule_num + 1;
        v_current_date := v_current_date + v_interval;
    END LOOP;

    -- Update invoice payment terms
    UPDATE invoices
    SET payment_terms = jsonb_build_object(
        'type', 'installment',
        'installments', p_installments,
        'frequency', p_frequency,
        'deposit_percent', p_deposit_percent,
        'deposit_amount', v_deposit_amount
    )
    WHERE id = p_invoice_id;

    RETURN;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_payment_schedule(text, integer, text, numeric, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_overdue_schedules() TO authenticated;

-- ============================================
-- STEP 11: Initialize amount_paid for existing invoices
-- ============================================

-- Calculate amount_paid from existing payments
UPDATE invoices i
SET amount_paid = COALESCE(
    (SELECT SUM(p.amount)
     FROM payments p
     WHERE p.invoice_id = i.id
     AND p.status = 'COMPLETED'),
    0
);

-- ============================================
-- STEP 12: Add comments
-- ============================================

COMMENT ON TABLE payment_schedules IS
'Payment installment schedules for invoices. Enables partial payments and payment plans.';

COMMENT ON COLUMN invoices.amount_paid IS
'Total amount received for this invoice from completed payments';

COMMENT ON COLUMN invoices.balance IS
'Remaining balance (total - amount_paid). Auto-calculated.';

COMMENT ON COLUMN invoices.payment_terms IS
'Payment plan configuration: type, installments, frequency, deposit info';

COMMENT ON FUNCTION generate_payment_schedule IS
'Creates a payment schedule for an invoice. Usage: SELECT * FROM generate_payment_schedule(invoice_id, 3, ''monthly'', 30)';

COMMENT ON FUNCTION mark_overdue_schedules IS
'Marks pending payment schedules as overdue if past due date. Call via cron job.';
