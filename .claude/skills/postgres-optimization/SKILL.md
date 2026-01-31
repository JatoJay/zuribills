---
name: postgres-optimization
description: Optimize PostgreSQL database schemas for performance, data integrity, and scalability. Use this skill when reviewing database schemas, creating migrations, optimizing queries, adding indexes, implementing foreign keys, or applying PostgreSQL best practices. Triggers include schema review, slow query optimization, adding constraints, JSONB usage, RLS policies, and migration safety.
---

# PostgreSQL Schema Optimization

## Quick Reference

| Topic | See |
|-------|-----|
| Data types, UUIDs, numeric, JSONB | [references/data-types.md](references/data-types.md) |
| Indexing strategies, EXPLAIN | [references/indexing.md](references/indexing.md) |
| Foreign keys, constraints, migrations | [references/constraints.md](references/constraints.md) |
| Row Level Security patterns | [references/rls.md](references/rls.md) |

## Schema Review Checklist

When reviewing a PostgreSQL schema, check:

**Data Types**
- [ ] Primary keys use `uuid` or `bigserial`, not `text`
- [ ] Monetary values use `numeric`, not `double precision`
- [ ] Status/enum fields have constraints
- [ ] Timestamps use `timestamptz`

**Constraints**
- [ ] All foreign keys are defined
- [ ] Appropriate ON DELETE behavior specified
- [ ] Check constraints for business rules
- [ ] NOT NULL on required fields

**Indexes**
- [ ] All foreign keys are indexed
- [ ] Common query patterns have composite indexes
- [ ] JSONB columns have GIN indexes if queried
- [ ] No redundant or unused indexes

**Performance**
- [ ] Large tables have partitioning strategy
- [ ] Frequently-queried JSONB fields extracted
- [ ] RLS policies are efficient and indexed

**Maintainability**
- [ ] `created_at` and `updated_at` on all tables
- [ ] Consistent naming conventions
