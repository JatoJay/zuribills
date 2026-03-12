-- Add multi-branch support for businesses operating in the same country
-- Allows organizations to have parent/child relationships with optional data sharing

-- Add branch-related columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS parent_organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branch_code TEXT,
ADD COLUMN IF NOT EXISTS share_clients_with_parent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_services_with_parent BOOLEAN DEFAULT false;

-- Create index for faster branch lookups
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_organization_id) WHERE parent_organization_id IS NOT NULL;

-- Create index for branch code lookups within same parent
CREATE INDEX IF NOT EXISTS idx_organizations_branch_code ON organizations(parent_organization_id, branch_code) WHERE branch_code IS NOT NULL;

COMMENT ON COLUMN organizations.parent_organization_id IS 'Reference to headquarters/parent organization for branches';
COMMENT ON COLUMN organizations.branch_code IS 'Unique identifier for the branch (e.g., LAG-001, HQ)';
COMMENT ON COLUMN organizations.share_clients_with_parent IS 'When true, branch can access clients from parent organization';
COMMENT ON COLUMN organizations.share_services_with_parent IS 'When true, branch can access services from parent organization';
