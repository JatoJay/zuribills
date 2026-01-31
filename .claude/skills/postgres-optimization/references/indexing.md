# PostgreSQL Indexing Strategies

## When to Create Indexes
- **Foreign keys**: Always index foreign key columns for join performance
- **Filtered queries**: Columns frequently used in WHERE clauses
- **Sorted results**: Columns used in ORDER BY
- **Unique lookups**: Columns used for finding specific records

## Index Types
| Type | Best For |
|------|----------|
| B-tree (default) | Equality and range queries |
| GIN | JSONB, arrays, full-text search |
| GiST | Geometric and range types |
| Hash | Simple equality (rarely needed) |

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

-- Covering index to avoid table lookups
create index idx_invoices_covering
on invoices (organization_id, status)
include (total, client_name, date);
```

## Index Anti-Patterns
- **Don't over-index**: Each index adds write overhead
- **Avoid indexing low-cardinality columns alone**: Boolean columns rarely benefit
- **Review unused indexes**: Use `pg_stat_user_indexes` to find unused indexes

```sql
-- Find unused indexes
select schemaname, relname, indexrelname, idx_scan
from pg_stat_user_indexes
where idx_scan = 0
order by pg_relation_size(indexrelid) desc;
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
- **Keyset pagination**: Over OFFSET for large datasets

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
