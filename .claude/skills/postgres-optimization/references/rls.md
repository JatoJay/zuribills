# PostgreSQL Row Level Security (RLS)

## Best Practices
- **Keep policies simple**: Complex policies hurt performance
- **Index policy-referenced columns**: Especially in subqueries
- **Use security definer functions**: For reusable policy logic
- **Test with EXPLAIN**: Ensure policies use indexes

```sql
-- Efficient: Direct column check with indexed lookup
create policy org_select on invoices for select
using (organization_id in (
  select organization_id from org_memberships
  where user_id = current_user_id()
));

-- Ensure supporting index exists
create index idx_org_memberships_user_org
on org_memberships (user_id, organization_id);
```

## Reusable Policy Functions

```sql
create or replace function is_org_member(org_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_memberships m
    where m.organization_id = org_id
      and m.user_id = current_user_id()
  );
$$;

-- Use in policies
create policy invoices_select on invoices for select
using (is_org_member(organization_id));
```

## Common Patterns

### Multi-tenant isolation
```sql
create policy tenant_isolation on table_name
for all using (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Owner + admin access
```sql
create policy owner_or_admin on resources
for all using (
  owner_id = current_user_id()
  or is_admin(current_user_id())
);
```

### Public read, authenticated write
```sql
create policy public_read on posts for select using (true);
create policy auth_write on posts for insert
with check (auth.uid() is not null);
```
