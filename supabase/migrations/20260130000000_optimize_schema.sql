-- PostgreSQL Schema Optimization Migration
-- Applies best practices: proper data types, foreign keys, constraints, indexes

-- ============================================
-- STEP 1: Create enum types for status fields
-- ============================================

do $$ begin
  create type user_role as enum ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type org_role as enum ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type invoice_status as enum ('DRAFT', 'PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type expense_status as enum ('DRAFT', 'PENDING', 'APPROVED', 'PAID', 'REJECTED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status as enum ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type agent_log_type as enum ('INFO', 'WARNING', 'ERROR', 'ACTION');
exception when duplicate_object then null;
end $$;

-- ============================================
-- STEP 2: Create updated_at trigger function
-- ============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================
-- STEP 3: Add updated_at columns to all tables
-- ============================================

alter table accounts add column if not exists updated_at timestamptz not null default now();
alter table users add column if not exists updated_at timestamptz not null default now();
alter table organizations add column if not exists updated_at timestamptz not null default now();
alter table org_memberships add column if not exists updated_at timestamptz not null default now();
alter table services add column if not exists updated_at timestamptz not null default now();
alter table services add column if not exists created_at timestamptz not null default now();
alter table clients add column if not exists updated_at timestamptz not null default now();
alter table invoices add column if not exists created_at timestamptz not null default now();
alter table invoices add column if not exists updated_at timestamptz not null default now();
alter table invoice_transfers add column if not exists updated_at timestamptz not null default now();
alter table expenses add column if not exists created_at timestamptz not null default now();
alter table expenses add column if not exists updated_at timestamptz not null default now();
alter table payments add column if not exists updated_at timestamptz not null default now();
alter table agent_logs add column if not exists created_at timestamptz not null default now();

-- ============================================
-- STEP 4: Create updated_at triggers
-- ============================================

drop trigger if exists accounts_updated_at on accounts;
create trigger accounts_updated_at before update on accounts
  for each row execute function update_updated_at();

drop trigger if exists users_updated_at on users;
create trigger users_updated_at before update on users
  for each row execute function update_updated_at();

drop trigger if exists organizations_updated_at on organizations;
create trigger organizations_updated_at before update on organizations
  for each row execute function update_updated_at();

drop trigger if exists org_memberships_updated_at on org_memberships;
create trigger org_memberships_updated_at before update on org_memberships
  for each row execute function update_updated_at();

drop trigger if exists services_updated_at on services;
create trigger services_updated_at before update on services
  for each row execute function update_updated_at();

drop trigger if exists clients_updated_at on clients;
create trigger clients_updated_at before update on clients
  for each row execute function update_updated_at();

drop trigger if exists invoices_updated_at on invoices;
create trigger invoices_updated_at before update on invoices
  for each row execute function update_updated_at();

drop trigger if exists invoice_transfers_updated_at on invoice_transfers;
create trigger invoice_transfers_updated_at before update on invoice_transfers
  for each row execute function update_updated_at();

drop trigger if exists expenses_updated_at on expenses;
create trigger expenses_updated_at before update on expenses
  for each row execute function update_updated_at();

drop trigger if exists payments_updated_at on payments;
create trigger payments_updated_at before update on payments
  for each row execute function update_updated_at();

-- ============================================
-- STEP 5: Convert monetary columns from double precision to numeric
-- ============================================

-- Services
alter table services
  alter column price type numeric(15,2) using price::numeric(15,2),
  alter column deposit_requirement type numeric(15,2) using deposit_requirement::numeric(15,2);

-- Invoices
alter table invoices
  alter column subtotal type numeric(15,2) using subtotal::numeric(15,2),
  alter column tax_rate type numeric(5,4) using (tax_rate / 100)::numeric(5,4),
  alter column tax_amount type numeric(15,2) using tax_amount::numeric(15,2),
  alter column total type numeric(15,2) using total::numeric(15,2);

-- Invoice Transfers
alter table invoice_transfers
  alter column original_amount type numeric(15,2) using original_amount::numeric(15,2),
  alter column new_amount type numeric(15,2) using new_amount::numeric(15,2),
  alter column price_delta type numeric(15,2) using price_delta::numeric(15,2);

-- Expenses
alter table expenses
  alter column subtotal type numeric(15,2) using subtotal::numeric(15,2),
  alter column tax_rate type numeric(5,4) using (tax_rate / 100)::numeric(5,4),
  alter column tax_amount type numeric(15,2) using tax_amount::numeric(15,2),
  alter column total type numeric(15,2) using total::numeric(15,2);

-- Payments
alter table payments
  alter column amount type numeric(15,2) using amount::numeric(15,2),
  alter column platform_fee_percent type numeric(5,4) using platform_fee_percent::numeric(5,4),
  alter column platform_fee_amount type numeric(15,2) using platform_fee_amount::numeric(15,2),
  alter column net_amount type numeric(15,2) using net_amount::numeric(15,2);

-- ============================================
-- STEP 6: Add foreign key constraints
-- ============================================

-- Users -> Accounts
alter table users drop constraint if exists users_account_id_fkey;
alter table users add constraint users_account_id_fkey
  foreign key (account_id) references accounts(id) on delete cascade;

-- Organizations -> Accounts
alter table organizations drop constraint if exists organizations_account_id_fkey;
alter table organizations add constraint organizations_account_id_fkey
  foreign key (account_id) references accounts(id) on delete cascade;

-- Organizations -> Users (owner)
alter table organizations drop constraint if exists organizations_owner_id_fkey;
alter table organizations add constraint organizations_owner_id_fkey
  foreign key (owner_id) references users(id) on delete restrict;

-- Org Memberships -> Organizations
alter table org_memberships drop constraint if exists org_memberships_organization_id_fkey;
alter table org_memberships add constraint org_memberships_organization_id_fkey
  foreign key (organization_id) references organizations(id) on delete cascade;

-- Org Memberships -> Users
alter table org_memberships drop constraint if exists org_memberships_user_id_fkey;
alter table org_memberships add constraint org_memberships_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;

-- Services -> Organizations
alter table services drop constraint if exists services_organization_id_fkey;
alter table services add constraint services_organization_id_fkey
  foreign key (organization_id) references organizations(id) on delete cascade;

-- Clients -> Organizations
alter table clients drop constraint if exists clients_organization_id_fkey;
alter table clients add constraint clients_organization_id_fkey
  foreign key (organization_id) references organizations(id) on delete cascade;

-- Invoices -> Organizations
alter table invoices drop constraint if exists invoices_organization_id_fkey;
alter table invoices add constraint invoices_organization_id_fkey
  foreign key (organization_id) references organizations(id) on delete cascade;

-- Invoices -> Parent Invoice (self-reference)
alter table invoices drop constraint if exists invoices_parent_invoice_id_fkey;
alter table invoices add constraint invoices_parent_invoice_id_fkey
  foreign key (parent_invoice_id) references invoices(id) on delete set null;

-- Invoices -> Root Invoice (self-reference)
alter table invoices drop constraint if exists invoices_root_invoice_id_fkey;
alter table invoices add constraint invoices_root_invoice_id_fkey
  foreign key (root_invoice_id) references invoices(id) on delete set null;

-- Invoice Transfers -> Invoices
alter table invoice_transfers drop constraint if exists invoice_transfers_from_invoice_id_fkey;
alter table invoice_transfers add constraint invoice_transfers_from_invoice_id_fkey
  foreign key (from_invoice_id) references invoices(id) on delete cascade;

alter table invoice_transfers drop constraint if exists invoice_transfers_to_invoice_id_fkey;
alter table invoice_transfers add constraint invoice_transfers_to_invoice_id_fkey
  foreign key (to_invoice_id) references invoices(id) on delete cascade;

alter table invoice_transfers drop constraint if exists invoice_transfers_root_invoice_id_fkey;
alter table invoice_transfers add constraint invoice_transfers_root_invoice_id_fkey
  foreign key (root_invoice_id) references invoices(id) on delete cascade;

-- Expenses -> Organizations
alter table expenses drop constraint if exists expenses_organization_id_fkey;
alter table expenses add constraint expenses_organization_id_fkey
  foreign key (organization_id) references organizations(id) on delete cascade;

-- Payments -> Invoices
alter table payments drop constraint if exists payments_invoice_id_fkey;
alter table payments add constraint payments_invoice_id_fkey
  foreign key (invoice_id) references invoices(id) on delete cascade;

-- Agent Logs -> Organizations
alter table agent_logs drop constraint if exists agent_logs_organization_id_fkey;
alter table agent_logs add constraint agent_logs_organization_id_fkey
  foreign key (organization_id) references organizations(id) on delete cascade;

-- ============================================
-- STEP 7: Add check constraints
-- ============================================

-- Services: price must be non-negative
alter table services drop constraint if exists services_price_positive;
alter table services add constraint services_price_positive check (price >= 0);

alter table services drop constraint if exists services_deposit_positive;
alter table services add constraint services_deposit_positive check (deposit_requirement is null or deposit_requirement >= 0);

-- Invoices: amounts must be non-negative, due_date >= date
alter table invoices drop constraint if exists invoices_amounts_positive;
alter table invoices add constraint invoices_amounts_positive
  check (subtotal >= 0 and tax_amount >= 0 and total >= 0);

alter table invoices drop constraint if exists invoices_tax_rate_valid;
alter table invoices add constraint invoices_tax_rate_valid
  check (tax_rate >= 0 and tax_rate <= 1);

-- Fix data before adding constraint
update invoices set due_date = date where due_date < date;

alter table invoices drop constraint if exists invoices_due_date_valid;
alter table invoices add constraint invoices_due_date_valid
  check (due_date >= date);

-- Expenses: amounts must be non-negative
alter table expenses drop constraint if exists expenses_amounts_positive;
alter table expenses add constraint expenses_amounts_positive
  check (subtotal >= 0 and tax_amount >= 0 and total >= 0);

alter table expenses drop constraint if exists expenses_tax_rate_valid;
alter table expenses add constraint expenses_tax_rate_valid
  check (tax_rate >= 0 and tax_rate <= 1);

-- Payments: amount must be positive
alter table payments drop constraint if exists payments_amount_positive;
alter table payments add constraint payments_amount_positive check (amount > 0);

-- Fix invalid fee percentages (convert from percentage to decimal if > 1)
update payments set platform_fee_percent = platform_fee_percent / 100
where platform_fee_percent is not null and platform_fee_percent > 1;

alter table payments drop constraint if exists payments_fee_valid;
alter table payments add constraint payments_fee_valid
  check (platform_fee_percent is null or (platform_fee_percent >= 0 and platform_fee_percent <= 1));

-- ============================================
-- STEP 8: Add additional performance indexes
-- ============================================

-- Composite indexes for common query patterns
create index if not exists idx_invoices_org_status on invoices (organization_id, status);
create index if not exists idx_invoices_org_date on invoices (organization_id, date desc);
create index if not exists idx_invoices_org_due_date on invoices (organization_id, due_date);

create index if not exists idx_expenses_org_status on expenses (organization_id, status);
create index if not exists idx_expenses_org_date on expenses (organization_id, date desc);

create index if not exists idx_payments_status on payments (status);
create index if not exists idx_payments_date on payments (date desc);

create index if not exists idx_clients_org_email on clients (organization_id, lower(email));
create index if not exists idx_clients_org_name on clients (organization_id, lower(name));

create index if not exists idx_services_org_active on services (organization_id) where is_active = true;
create index if not exists idx_services_org_category on services (organization_id, category) where is_active = true;

create index if not exists idx_agent_logs_org_timestamp on agent_logs (organization_id, timestamp desc);
create index if not exists idx_agent_logs_org_type on agent_logs (organization_id, type);

-- GIN indexes for JSONB columns
create index if not exists idx_invoices_items_gin on invoices using gin (items);
create index if not exists idx_expenses_items_gin on expenses using gin (items);
create index if not exists idx_users_permissions_gin on users using gin (permissions);
create index if not exists idx_org_memberships_permissions_gin on org_memberships using gin (permissions);
create index if not exists idx_organizations_address_gin on organizations using gin (address);
create index if not exists idx_clients_address_gin on clients using gin (address);

-- Unique constraint for invoice numbers per organization
create unique index if not exists idx_invoices_org_number_unique
  on invoices (organization_id, invoice_number);

-- Unique constraint for expense numbers per organization
create unique index if not exists idx_expenses_org_number_unique
  on expenses (organization_id, expense_number);

-- Index for email lookups (case-insensitive)
create index if not exists idx_users_email_lower on users (lower(email));
create index if not exists idx_organizations_slug on organizations (slug);

-- ============================================
-- STEP 9: Add comments for documentation
-- ============================================

comment on table accounts is 'Top-level account container for multi-tenancy';
comment on table users is 'Application users belonging to an account';
comment on table organizations is 'Business entities within an account';
comment on table org_memberships is 'User membership and roles within organizations';
comment on table services is 'Products/services offered by organizations';
comment on table clients is 'Customer contacts for organizations';
comment on table invoices is 'Invoice records with support for transfers';
comment on table invoice_transfers is 'Audit trail for invoice ownership transfers';
comment on table expenses is 'Expense tracking records';
comment on table payments is 'Payment transactions linked to invoices';
comment on table agent_logs is 'Audit logs for automated agent actions';

comment on column invoices.tax_rate is 'Tax rate as decimal (0.0 to 1.0, e.g., 0.075 for 7.5%)';
comment on column expenses.tax_rate is 'Tax rate as decimal (0.0 to 1.0, e.g., 0.075 for 7.5%)';
comment on column payments.platform_fee_percent is 'Platform fee as decimal (0.0 to 1.0)';
