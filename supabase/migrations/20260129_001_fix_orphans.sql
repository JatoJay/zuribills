-- Fix orphaned records before adding foreign key constraints

-- Create missing accounts for orphaned users
insert into accounts (id, name, owner_user_id, contact_email, created_at)
select distinct
  u.account_id,
  'Auto-created Account',
  u.id,
  u.email,
  now()
from users u
left join accounts a on a.id = u.account_id
where a.id is null
on conflict (id) do nothing;

-- Create missing accounts for orphaned organizations
insert into accounts (id, name, owner_user_id, contact_email, created_at)
select distinct
  o.account_id,
  o.name || ' Account',
  o.owner_id,
  o.contact_email,
  now()
from organizations o
left join accounts a on a.id = o.account_id
where a.id is null
on conflict (id) do nothing;

-- Fix organization owner_id references - set to first user in same account if owner doesn't exist
update organizations o
set owner_id = (
  select u.id from users u where u.account_id = o.account_id limit 1
)
where not exists (select 1 from users u where u.id = o.owner_id);

-- Delete org_memberships with non-existent organizations
delete from org_memberships om
where not exists (select 1 from organizations o where o.id = om.organization_id);

-- Delete org_memberships with non-existent users
delete from org_memberships om
where not exists (select 1 from users u where u.id = om.user_id);

-- Delete services with non-existent organizations
delete from services s
where not exists (select 1 from organizations o where o.id = s.organization_id);

-- Delete clients with non-existent organizations
delete from clients c
where not exists (select 1 from organizations o where o.id = c.organization_id);

-- Delete invoices with non-existent organizations
delete from invoices i
where not exists (select 1 from organizations o where o.id = i.organization_id);

-- Delete expenses with non-existent organizations
delete from expenses e
where not exists (select 1 from organizations o where o.id = e.organization_id);

-- Delete payments with non-existent invoices
delete from payments p
where not exists (select 1 from invoices i where i.id = p.invoice_id);

-- Delete agent_logs with non-existent organizations
delete from agent_logs al
where not exists (select 1 from organizations o where o.id = al.organization_id);

-- Delete invoice_transfers with non-existent invoices
delete from invoice_transfers it
where not exists (select 1 from invoices i where i.id = it.from_invoice_id)
   or not exists (select 1 from invoices i where i.id = it.to_invoice_id)
   or not exists (select 1 from invoices i where i.id = it.root_invoice_id);

-- Clear orphaned parent/root invoice references
update invoices set parent_invoice_id = null
where parent_invoice_id is not null
  and not exists (select 1 from invoices i where i.id = invoices.parent_invoice_id);

update invoices set root_invoice_id = null
where root_invoice_id is not null
  and not exists (select 1 from invoices i where i.id = invoices.root_invoice_id);

-- Fix invoices where due_date is before date
update invoices set due_date = date where due_date < date;

-- Fix expenses where due_date is before date
update expenses set due_date = date where due_date < date;
