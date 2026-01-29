---
name: postgres-optimization
description: Optimize PostgreSQL database schemas for performance, data integrity, and scalability. Use this skill when reviewing database schemas, creating migrations, optimizing queries, adding indexes, or implementing PostgreSQL best practices. Provides guidance on data types, constraints, indexing strategies, normalization, and query optimization.
license: MIT
---

This skill guides optimization of PostgreSQL database schemas following industry best practices for performance, data integrity, and maintainability.

## Data Types Best Practices

### Primary Keys
- **Use UUID**: Prefer `uuid` with `gen_random_uuid()` over `text` for primary keys - more efficient storage (16 bytes vs variable), better indexing, and native PostgreSQL support
- **Never use `text` for IDs**: Text IDs are slower to compare, index, and join
- **Alternative**: `bigserial` for auto-incrementing integer IDs when UUID isn't needed

```sql
-- GOOD
id uuid primary key default gen_random_uuid()

-- AVOID
id text primary key
```

### Numeric Types
- **Money/Currency**: Use `numeric(precision, scale)` or `bigint` (store cents) instead of `double precision` - floating point has rounding errors
- **Percentages**: Use `numeric(5,4)` for precise decimal representation
- **Counts/Quantities**: Use `integer` or `bigint`

```sql
-- GOOD: Precise monetary values
total numeric(15,2) not null default 0
price_cents bigint not null default 0

-- AVOID: Floating point for money
total double precision not null default 0
```

### Text Types
- **Bounded text**: Use `varchar(n)` when there's a logical maximum length
- **Unbounded text**: Use `text` for variable-length with no limit
- **Enums**: Use PostgreSQL `enum` types or check constraints for fixed value sets

```sql
-- GOOD: Constrained status values
create type invoice_status as enum ('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED');
status invoice_status not null default 'DRAFT'

-- OR with check constraint
status text not null check (status in ('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'))
```

### Timestamps
- **Always use `timestamptz`**: Stores UTC, handles timezone conversion automatically
- **Add `created_at` and `updated_at`**: Essential for auditing and debugging
- **Use triggers for `updated_at`**: Ensures automatic updates

```sql
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()

-- Auto-update trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

## Constraints & Referential Integrity

### Foreign Keys
- **Always define foreign keys**: Ensures data integrity and enables cascade operations
- **Choose appropriate ON DELETE behavior**:
  - `CASCADE`: Delete child when parent deleted (logs, line items)
  - `SET NULL`: Nullify reference (optional relationships)
  - `RESTRICT`: Prevent deletion if children exist (default, safest)

```sql
-- GOOD: Explicit foreign key with cascade behavior
organization_id uuid not null references organizations(id) on delete cascade,
client_id uuid references clients(id) on delete set null
```

### Check Constraints
- **Validate data at database level**: Don't rely solely on application validation
- **Common patterns**: Non-negative amounts, valid email format, date ranges

```sql
-- Ensure positive amounts
check (total >= 0),
check (tax_rate >= 0 and tax_rate <= 1),

-- Ensure due_date after date
check (due_date >= date)
```

### Unique Constraints
- **Use partial unique indexes**: For conditional uniqueness
- **Composite unique constraints**: For multi-column uniqueness

```sql
-- Unique invoice number per organization
unique (organization_id, invoice_number)

-- Unique active email per org (partial index)
create unique index idx_clients_active_email
on clients (organization_id, lower(email))
where deleted_at is null;
```

## Indexing Strategies

### When to Create Indexes
- **Foreign keys**: Always index foreign key columns for join performance
- **Filtered queries**: Columns frequently used in WHERE clauses
- **Sorted results**: Columns used in ORDER BY
- **Unique lookups**: Columns used for finding specific records

### Index Types
- **B-tree (default)**: Best for equality and range queries
- **GIN**: Best for JSONB, arrays, full-text search
- **GiST**: Best for geometric and range types
- **Hash**: Only for simple equality (rarely needed)

```sql
-- Standard B-tree for foreign keys
create index idx_invoices_org_id on invoices (organization_id);

-- Composite index for common query patterns
create index idx_invoices_org_status_date
on invoices (organization_id, status, date desc);

-- GIN for JSONB columns
create index idx_invoices_items on invoices using gin (items);

-- Partial index for active records only
create index idx_services_active
on services (organization_id, name)
where is_active = true;
```

### Index Anti-Patterns
- **Don't over-index**: Each index adds write overhead
- **Avoid indexing low-cardinality columns alone**: Boolean columns rarely benefit
- **Review unused indexes**: Use `pg_stat_user_indexes` to find unused indexes

## JSONB Best Practices

### When to Use JSONB
- **Flexible/optional attributes**: User preferences, metadata
- **Nested structures**: Address objects, configuration
- **Arrays of objects**: Line items, permissions

### When NOT to Use JSONB
- **Frequently queried fields**: Extract to dedicated columns
- **Required fields**: Use proper columns with NOT NULL
- **Foreign key relationships**: Cannot enforce referential integrity in JSONB

```sql
-- GOOD: Extract frequently-queried JSONB fields
-- Instead of querying address->>'city' repeatedly:
city text generated always as (address->>'city') stored,
create index idx_clients_city on clients (city);

-- Validate JSONB structure with check constraints
check (
  address is null or (
    address ? 'street' and
    address ? 'city' and
    address ? 'country'
  )
)
```

## Query Optimization

### Use EXPLAIN ANALYZE
```sql
explain (analyze, buffers, format text)
select * from invoices where organization_id = 'xxx' and status = 'PENDING';
```

### Common Optimizations
- **Avoid SELECT ***: Only select needed columns
- **Use EXISTS over IN**: For subquery existence checks
- **Batch operations**: Use bulk inserts/updates
- **Pagination**: Use keyset pagination over OFFSET for large datasets

```sql
-- GOOD: Keyset pagination
select * from invoices
where organization_id = 'xxx'
  and (date, id) < ('2024-01-01', 'last-id')
order by date desc, id desc
limit 20;

-- AVOID: Offset pagination on large tables
select * from invoices offset 10000 limit 20;
```

## Schema Migration Best Practices

### Safe Migrations
- **Add columns as nullable first**: Then backfill, then add NOT NULL
- **Create indexes concurrently**: Avoid locking tables
- **Use transactions carefully**: DDL is transactional in PostgreSQL

```sql
-- Safe column addition
alter table invoices add column new_field text;
update invoices set new_field = 'default' where new_field is null;
alter table invoices alter column new_field set not null;

-- Concurrent index creation (no table lock)
create index concurrently idx_name on table_name (column);
```

## Row Level Security (RLS)

### Best Practices
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

## Schema Review Checklist

When reviewing a PostgreSQL schema, check:

1. **Data Types**
   - [ ] Primary keys use `uuid` or `bigserial`, not `text`
   - [ ] Monetary values use `numeric`, not `double precision`
   - [ ] Status/enum fields have constraints
   - [ ] Timestamps use `timestamptz`

2. **Constraints**
   - [ ] All foreign keys are defined
   - [ ] Appropriate ON DELETE behavior specified
   - [ ] Check constraints for business rules
   - [ ] NOT NULL on required fields

3. **Indexes**
   - [ ] All foreign keys are indexed
   - [ ] Common query patterns have composite indexes
   - [ ] JSONB columns have GIN indexes if queried
   - [ ] No redundant or unused indexes

4. **Performance**
   - [ ] Large tables have appropriate partitioning strategy
   - [ ] JSONB fields extracted if frequently queried
   - [ ] RLS policies are efficient and indexed

5. **Maintainability**
   - [ ] `created_at` and `updated_at` on all tables
   - [ ] Consistent naming conventions
   - [ ] Comments on complex columns/constraints
