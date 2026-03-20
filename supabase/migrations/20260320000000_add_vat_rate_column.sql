-- Add vat_rate column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 0;

COMMENT ON COLUMN organizations.vat_rate IS 'VAT/Tax rate percentage for the organization';
