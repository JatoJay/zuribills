-- Supabase schema for InvoiceFlow

create table if not exists accounts (
  id text primary key,
  name text not null,
  owner_user_id text not null,
  contact_email text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  account_id text not null,
  name text not null,
  email text not null,
  role text not null,
  permissions jsonb not null default '[]'::jsonb,
  pin text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists organizations (
  id text primary key,
  account_id text not null,
  owner_id text not null,
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null,
  currency text not null,
  catalog_enabled boolean not null default false,
  preferred_language text,
  contact_email text not null,
  contact_phone text,
  tax_id text,
  signatory_name text,
  signatory_title text,
  address jsonb,
  payment_config jsonb,
  trial jsonb,
  subscription jsonb,
  created_at timestamptz not null default now()
);

create table if not exists org_memberships (
  id text primary key,
  organization_id text not null,
  user_id text not null,
  role text not null,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists services (
  id text primary key,
  organization_id text not null,
  name text not null,
  description text,
  price double precision not null default 0,
  category text,
  is_active boolean not null default true,
  deposit_requirement double precision,
  image_url text
);

create table if not exists clients (
  id text primary key,
  organization_id text not null,
  name text not null,
  email text not null,
  company text,
  phone text,
  address jsonb,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id text primary key,
  organization_id text not null,
  invoice_number text not null,
  client_name text not null,
  client_email text not null,
  client_company text,
  client_tin text,
  items jsonb not null default '[]'::jsonb,
  subtotal double precision not null default 0,
  tax_rate double precision not null default 0,
  tax_amount double precision not null default 0,
  total double precision not null default 0,
  status text not null,
  date timestamptz not null,
  due_date timestamptz not null,
  notes text,
  ownership_transfer jsonb,
  parent_invoice_id text,
  root_invoice_id text,
  transfer_sequence integer default 0
);

create table if not exists invoice_transfers (
  id text primary key,
  from_invoice_id text not null,
  to_invoice_id text not null,
  root_invoice_id text not null,
  from_client_name text not null,
  from_client_email text not null,
  from_client_company text,
  to_client_name text not null,
  to_client_email text not null,
  to_client_company text,
  original_amount double precision not null,
  new_amount double precision not null,
  price_delta double precision not null,
  reason text,
  transferred_at timestamptz not null default now(),
  transfer_sequence integer not null default 1
);

create table if not exists expenses (
  id text primary key,
  organization_id text not null,
  expense_number text not null,
  vendor_name text not null,
  vendor_email text,
  vendor_company text,
  category text,
  items jsonb not null default '[]'::jsonb,
  subtotal double precision not null default 0,
  tax_rate double precision not null default 0,
  tax_amount double precision not null default 0,
  total double precision not null default 0,
  status text not null,
  date timestamptz not null,
  due_date timestamptz not null,
  notes text,
  reference text
);

create table if not exists payments (
  id text primary key,
  invoice_id text not null,
  amount double precision not null default 0,
  currency text,
  status text,
  provider text,
  provider_reference text,
  platform_fee_percent double precision,
  platform_fee_amount double precision,
  net_amount double precision,
  date timestamptz not null,
  method text not null,
  created_at timestamptz not null default now()
);

create table if not exists agent_logs (
  id text primary key,
  organization_id text not null,
  timestamp timestamptz not null,
  action text not null,
  details text not null,
  related_id text,
  type text not null
);

create index if not exists idx_users_account_id on users (account_id);
create index if not exists idx_orgs_account_id on organizations (account_id);
create index if not exists idx_org_memberships_org_id on org_memberships (organization_id);
create index if not exists idx_org_memberships_user_id on org_memberships (user_id);
create index if not exists idx_services_org_id on services (organization_id);
create index if not exists idx_clients_org_id on clients (organization_id);
create index if not exists idx_invoices_org_id on invoices (organization_id);
create index if not exists idx_expenses_org_id on expenses (organization_id);
create index if not exists idx_payments_invoice_id on payments (invoice_id);
create index if not exists idx_agent_logs_org_id on agent_logs (organization_id);
create index if not exists idx_invoice_transfers_from on invoice_transfers (from_invoice_id);
create index if not exists idx_invoice_transfers_to on invoice_transfers (to_invoice_id);
create index if not exists idx_invoice_transfers_root on invoice_transfers (root_invoice_id);
create index if not exists idx_invoices_parent on invoices (parent_invoice_id);
create index if not exists idx_invoices_root on invoices (root_invoice_id);

alter table public.invoices add column if not exists parent_invoice_id text;
alter table public.invoices add column if not exists root_invoice_id text;
alter table public.invoices add column if not exists transfer_sequence integer default 0;

alter table public.payments add column if not exists currency text;
alter table public.payments add column if not exists status text;
alter table public.payments add column if not exists provider text;
alter table public.payments add column if not exists provider_reference text;
alter table public.payments add column if not exists platform_fee_percent double precision;
alter table public.payments add column if not exists platform_fee_amount double precision;
alter table public.payments add column if not exists net_amount double precision;
alter table public.payments add column if not exists created_at timestamptz not null default now();

-- Row level security
alter table public.accounts enable row level security;
alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.org_memberships enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;
alter table public.agent_logs enable row level security;
alter table public.invoice_transfers enable row level security;

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(lower(auth.jwt() ->> 'email'), '');
$$;

create or replace function public.current_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where lower(u.email) = public.current_user_email()
  limit 1;
$$;

create or replace function public.current_account_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.account_id
  from public.users u
  where lower(u.email) = public.current_user_email()
  limit 1;
$$;

create or replace function public.is_account_member(account_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(account_id = public.current_account_id(), false);
$$;

create or replace function public.is_account_admin(account_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = public.current_user_id()
      and u.account_id = account_id
      and u.role in ('OWNER', 'ADMIN')
  );
$$;

create or replace function public.is_org_member(org_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.organization_id = org_id
      and m.user_id = public.current_user_id()
  );
$$;

create or replace function public.is_org_admin(org_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.organization_id = org_id
      and m.user_id = public.current_user_id()
      and m.role in ('OWNER', 'ADMIN')
  );
$$;

create or replace function public.is_catalog_org(org_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = org_id
      and o.catalog_enabled = true
  );
$$;

drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts
  for select
  using (public.is_account_member(id));

drop policy if exists accounts_insert on public.accounts;
create policy accounts_insert on public.accounts
  for insert
  with check (public.current_user_id() = owner_user_id);

drop policy if exists accounts_update on public.accounts;
create policy accounts_update on public.accounts
  for update
  using (public.is_account_admin(id))
  with check (public.is_account_admin(id));

drop policy if exists accounts_delete on public.accounts;
create policy accounts_delete on public.accounts
  for delete
  using (public.is_account_admin(id));

drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select
  using (
    account_id = public.current_account_id()
    or id = public.current_user_id()
  );

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert
  with check (lower(email) = public.current_user_email());

drop policy if exists users_insert_admin on public.users;
create policy users_insert_admin on public.users
  for insert
  with check (public.is_account_admin(account_id));

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update
  using (
    public.is_account_admin(account_id)
    or id = public.current_user_id()
  )
  with check (
    public.is_account_admin(account_id)
    or id = public.current_user_id()
  );

drop policy if exists users_delete on public.users;
create policy users_delete on public.users
  for delete
  using (public.is_account_admin(account_id));

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select
  using (
    public.is_account_member(account_id)
    or public.is_catalog_org(id)
  );

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
  for insert
  with check (public.is_account_member(account_id));

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update
  using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
  for delete
  using (public.is_account_admin(account_id));

drop policy if exists org_memberships_select on public.org_memberships;
create policy org_memberships_select on public.org_memberships
  for select
  using (
    exists (
      select 1
      from public.organizations o
      where o.id = organization_id
        and public.is_account_member(o.account_id)
    )
  );

drop policy if exists org_memberships_insert on public.org_memberships;
create policy org_memberships_insert on public.org_memberships
  for insert
  with check (
    exists (
      select 1
      from public.organizations o
      where o.id = organization_id
        and public.is_account_admin(o.account_id)
    )
  );

drop policy if exists org_memberships_update on public.org_memberships;
create policy org_memberships_update on public.org_memberships
  for update
  using (
    exists (
      select 1
      from public.organizations o
      where o.id = organization_id
        and public.is_account_admin(o.account_id)
    )
  )
  with check (
    exists (
      select 1
      from public.organizations o
      where o.id = organization_id
        and public.is_account_admin(o.account_id)
    )
  );

drop policy if exists org_memberships_delete on public.org_memberships;
create policy org_memberships_delete on public.org_memberships
  for delete
  using (
    exists (
      select 1
      from public.organizations o
      where o.id = organization_id
        and public.is_account_admin(o.account_id)
    )
  );

drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select
  using (
    public.is_org_member(organization_id)
    or (public.is_catalog_org(organization_id) and is_active = true)
  );

drop policy if exists services_insert on public.services;
create policy services_insert on public.services
  for insert
  with check (public.is_org_member(organization_id));

drop policy if exists services_update on public.services;
create policy services_update on public.services
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists services_delete on public.services;
create policy services_delete on public.services
  for delete
  using (public.is_org_member(organization_id));

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select
  using (public.is_org_member(organization_id));

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert
  with check (public.is_org_member(organization_id));

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete
  using (public.is_org_member(organization_id));

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select
  using (
    public.is_org_member(organization_id)
    or public.is_catalog_org(organization_id)
  );

drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices
  for insert
  with check (
    public.is_org_member(organization_id)
    or (public.is_catalog_org(organization_id) and status = 'DRAFT')
  );

drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices
  for update
  using (
    public.is_org_member(organization_id)
    or public.is_catalog_org(organization_id)
  )
  with check (
    public.is_org_member(organization_id)
    or (public.is_catalog_org(organization_id) and status = 'PAID')
  );

drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices
  for delete
  using (public.is_org_member(organization_id));

drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select
  using (public.is_org_member(organization_id));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert
  with check (public.is_org_member(organization_id));

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses
  for delete
  using (public.is_org_member(organization_id));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and public.is_org_member(i.organization_id)
    )
  );

drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments
  for insert
  with check (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and public.is_org_member(i.organization_id)
    )
  );

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments
  for update
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and public.is_org_member(i.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and public.is_org_member(i.organization_id)
    )
  );

drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments
  for delete
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and public.is_org_member(i.organization_id)
    )
  );

drop policy if exists agent_logs_select on public.agent_logs;
create policy agent_logs_select on public.agent_logs
  for select
  using (public.is_org_member(organization_id));

drop policy if exists agent_logs_insert on public.agent_logs;
create policy agent_logs_insert on public.agent_logs
  for insert
  with check (public.is_org_member(organization_id));

drop policy if exists agent_logs_update on public.agent_logs;
create policy agent_logs_update on public.agent_logs
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists agent_logs_delete on public.agent_logs;
create policy agent_logs_delete on public.agent_logs
  for delete
  using (public.is_org_member(organization_id));

drop policy if exists invoice_transfers_select on public.invoice_transfers;
create policy invoice_transfers_select on public.invoice_transfers
  for select
  using (
    exists (
      select 1
      from public.invoices i
      where (i.id = from_invoice_id or i.id = to_invoice_id)
        and public.is_org_member(i.organization_id)
    )
  );

drop policy if exists invoice_transfers_insert on public.invoice_transfers;
create policy invoice_transfers_insert on public.invoice_transfers
  for insert
  with check (
    exists (
      select 1
      from public.invoices i
      where i.id = from_invoice_id
        and public.is_org_member(i.organization_id)
    )
  );

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  existing_user_id text;
begin
  if new.email is null then
    return new;
  end if;

  select u.id
    into existing_user_id
    from public.users u
   where lower(u.email) = lower(new.email)
   limit 1;

  if existing_user_id is not null then
    return new;
  end if;

  display_name := initcap(
    regexp_replace(split_part(new.email, '@', 1), '[._-]+', ' ', 'g')
  );

  insert into public.accounts (id, name, owner_user_id, contact_email)
  values (
    new.id::text,
    coalesce(nullif(display_name, ''), 'Account'),
    new.id::text,
    lower(new.email)
  )
  on conflict (id) do nothing;

  insert into public.users (id, account_id, name, email, role, permissions, created_at)
  values (
    new.id::text,
    new.id::text,
    coalesce(nullif(display_name, ''), 'Workspace Owner'),
    lower(new.email),
    'OWNER',
    '["ALL"]'::jsonb,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
