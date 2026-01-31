# PostgreSQL Data Types Best Practices

## Primary Keys
- **Use UUID**: Prefer `uuid` with `gen_random_uuid()` over `text` - more efficient storage (16 bytes vs variable), better indexing
- **Never use `text` for IDs**: Text IDs are slower to compare, index, and join
- **Alternative**: `bigserial` for auto-incrementing integer IDs when UUID isn't needed

```sql
-- GOOD
id uuid primary key default gen_random_uuid()

-- AVOID
id text primary key
```

## Numeric Types
- **Money/Currency**: Use `numeric(precision, scale)` or `bigint` (store cents) instead of `double precision`
- **Percentages**: Use `numeric(5,4)` for precise decimal representation
- **Counts/Quantities**: Use `integer` or `bigint`

```sql
-- GOOD: Precise monetary values
total numeric(15,2) not null default 0
price_cents bigint not null default 0

-- AVOID: Floating point for money
total double precision not null default 0
```

## Text Types
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

## Timestamps
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

## JSONB Best Practices

### When to Use JSONB
- Flexible/optional attributes (user preferences, metadata)
- Nested structures (address objects, configuration)
- Arrays of objects (line items, permissions)

### When NOT to Use JSONB
- Frequently queried fields → extract to dedicated columns
- Required fields → use proper columns with NOT NULL
- Foreign key relationships → cannot enforce referential integrity

```sql
-- Extract frequently-queried JSONB fields
city text generated always as (address->>'city') stored,
create index idx_clients_city on clients (city);

-- Validate JSONB structure
check (
  address is null or (
    address ? 'street' and
    address ? 'city' and
    address ? 'country'
  )
)
```
