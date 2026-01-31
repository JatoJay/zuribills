# PostgreSQL Constraints & Referential Integrity

## Foreign Keys
- **Always define foreign keys**: Ensures data integrity and enables cascade operations
- **Choose appropriate ON DELETE behavior**:
  - `CASCADE`: Delete child when parent deleted (logs, line items)
  - `SET NULL`: Nullify reference (optional relationships)
  - `RESTRICT`: Prevent deletion if children exist (default, safest)

```sql
-- Explicit foreign key with cascade behavior
organization_id uuid not null references organizations(id) on delete cascade,
client_id uuid references clients(id) on delete set null
```

## Check Constraints
Validate data at database level - don't rely solely on application validation.

```sql
-- Ensure positive amounts
check (total >= 0),
check (tax_rate >= 0 and tax_rate <= 1),

-- Ensure due_date after date
check (due_date >= date)
```

## Unique Constraints
```sql
-- Unique invoice number per organization
unique (organization_id, invoice_number)

-- Unique active email per org (partial index)
create unique index idx_clients_active_email
on clients (organization_id, lower(email))
where deleted_at is null;
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
