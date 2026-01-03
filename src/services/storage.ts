import {
  Account,
  Organization,
  OrgMembership,
  Service,
  Invoice,
  InvoiceStatus,
  Client,
  Payment,
  User,
  Expense,
  ExpenseStatus,
  UserRole,
  TrialInfo,
  AgentLog,
} from '../types';
import { getSupabaseClient } from './supabaseClient';
import { resolveCountryCode, resolveDefaultCurrency, resolvePayoutProvider } from './paymentRouting';

const CURRENT_ACCOUNT_KEY = 'invoiceflow_current_account';
const CURRENT_USER_KEY = 'invoiceflow_current_user';
const LEGACY_MIGRATION_KEY = 'invoiceflow_supabase_migrated';
const LEGACY_ORGS_KEY = 'invoiceflow_orgs';
const LEGACY_ACCOUNTS_KEY = 'invoiceflow_accounts';
const LEGACY_MEMBERSHIPS_KEY = 'invoiceflow_memberships';
const LEGACY_SERVICES_KEY = 'invoiceflow_services';
const LEGACY_INVOICES_KEY = 'invoiceflow_invoices';
const LEGACY_EXPENSES_KEY = 'invoiceflow_expenses';
const LEGACY_CLIENTS_KEY = 'invoiceflow_clients';
const LEGACY_PAYMENTS_KEY = 'invoiceflow_payments';
const LEGACY_USERS_KEY = 'invoiceflow_users';
const LEGACY_AGENT_LOGS_KEY = 'invoiceflow_agent_logs';

const TRIAL_DAYS = (() => {
  const parsed = Number.parseInt(import.meta.env.VITE_TRIAL_DAYS || '7', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
})();

const buildTrial = (startDate = new Date()): TrialInfo => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + TRIAL_DAYS);
  return {
    startsAt: startDate.toISOString(),
    endsAt: endDate.toISOString(),
    accessLevel: 'full',
  };
};

const toNullable = <T>(value: T | undefined): T | null => value ?? null;

const readLegacyList = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Failed to parse legacy data for ${key}`, error);
    return [];
  }
};

const mapAccountFromDb = (row: any): Account => ({
  id: row.id,
  name: row.name,
  ownerUserId: row.owner_user_id,
  contactEmail: row.contact_email ?? undefined,
  createdAt: row.created_at,
});

const mapAccountToDb = (account: Account) => ({
  id: account.id,
  name: account.name,
  owner_user_id: account.ownerUserId,
  contact_email: toNullable(account.contactEmail),
  created_at: account.createdAt,
});

const mapUserFromDb = (row: any): User => ({
  id: row.id,
  accountId: row.account_id,
  name: row.name,
  email: row.email,
  role: row.role,
  permissions: row.permissions || [],
  pin: row.pin ?? undefined,
  avatarUrl: row.avatar_url ?? undefined,
  createdAt: row.created_at,
});

const mapUserToDb = (user: User) => ({
  id: user.id,
  account_id: user.accountId,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: user.permissions || [],
  pin: toNullable(user.pin),
  avatar_url: toNullable(user.avatarUrl),
  created_at: user.createdAt,
});

const mapMembershipFromDb = (row: any): OrgMembership => ({
  id: row.id,
  organizationId: row.organization_id,
  userId: row.user_id,
  role: row.role,
  permissions: row.permissions || [],
  createdAt: row.created_at,
});

const mapMembershipToDb = (membership: OrgMembership) => ({
  id: membership.id,
  organization_id: membership.organizationId,
  user_id: membership.userId,
  role: membership.role,
  permissions: membership.permissions || [],
  created_at: membership.createdAt,
});

const mapOrganizationFromDb = (row: any): Organization => ({
  id: row.id,
  accountId: row.account_id,
  ownerId: row.owner_id,
  name: row.name,
  slug: row.slug,
  logoUrl: row.logo_url ?? undefined,
  primaryColor: row.primary_color,
  currency: row.currency,
  catalogEnabled: row.catalog_enabled ?? false,
  preferredLanguage: row.preferred_language ?? 'English',
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone ?? undefined,
  taxId: row.tax_id ?? undefined,
  signatoryName: row.signatory_name ?? undefined,
  signatoryTitle: row.signatory_title ?? undefined,
  address: row.address ?? undefined,
  paymentConfig: row.payment_config ?? undefined,
  trial: row.trial ?? undefined,
  subscription: row.subscription ?? undefined,
  createdAt: row.created_at,
});

const mapOrganizationToDb = (org: Organization) => ({
  id: org.id,
  account_id: org.accountId,
  owner_id: org.ownerId,
  name: org.name,
  slug: org.slug,
  logo_url: toNullable(org.logoUrl),
  primary_color: org.primaryColor,
  currency: org.currency,
  catalog_enabled: org.catalogEnabled ?? false,
  preferred_language: org.preferredLanguage || 'English',
  contact_email: org.contactEmail,
  contact_phone: toNullable(org.contactPhone),
  tax_id: toNullable(org.taxId),
  signatory_name: toNullable(org.signatoryName),
  signatory_title: toNullable(org.signatoryTitle),
  address: org.address ?? null,
  payment_config: org.paymentConfig ?? null,
  trial: org.trial ?? null,
  subscription: org.subscription ?? null,
  created_at: org.createdAt,
});

const mapServiceFromDb = (row: any): Service => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  description: row.description,
  price: row.price,
  category: row.category,
  isActive: row.is_active,
  depositRequirement: row.deposit_requirement ?? undefined,
  imageUrl: row.image_url ?? undefined,
});

const mapServiceToDb = (service: Service) => ({
  id: service.id,
  organization_id: service.organizationId,
  name: service.name,
  description: service.description,
  price: service.price,
  category: service.category,
  is_active: service.isActive,
  deposit_requirement: toNullable(service.depositRequirement),
  image_url: toNullable(service.imageUrl),
});

const mapClientFromDb = (row: any): Client => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  email: row.email,
  company: row.company ?? undefined,
  phone: row.phone ?? undefined,
  address: row.address ?? undefined,
  createdAt: row.created_at,
});

const mapClientToDb = (client: Client) => ({
  id: client.id,
  organization_id: client.organizationId,
  name: client.name,
  email: client.email,
  company: toNullable(client.company),
  phone: toNullable(client.phone),
  address: client.address ?? null,
  created_at: client.createdAt,
});

const mapInvoiceFromDb = (row: any): Invoice => ({
  id: row.id,
  organizationId: row.organization_id,
  invoiceNumber: row.invoice_number,
  clientName: row.client_name,
  clientEmail: row.client_email,
  clientCompany: row.client_company ?? undefined,
  items: row.items || [],
  subtotal: row.subtotal ?? 0,
  taxRate: row.tax_rate ?? 0,
  taxAmount: row.tax_amount ?? 0,
  total: row.total ?? 0,
  status: row.status,
  date: row.date,
  dueDate: row.due_date,
  notes: row.notes ?? undefined,
});

const mapInvoiceToDb = (invoice: Invoice) => ({
  id: invoice.id,
  organization_id: invoice.organizationId,
  invoice_number: invoice.invoiceNumber,
  client_name: invoice.clientName,
  client_email: invoice.clientEmail,
  client_company: toNullable(invoice.clientCompany),
  items: invoice.items || [],
  subtotal: invoice.subtotal,
  tax_rate: invoice.taxRate,
  tax_amount: invoice.taxAmount,
  total: invoice.total,
  status: invoice.status,
  date: invoice.date,
  due_date: invoice.dueDate,
  notes: toNullable(invoice.notes),
});

const mapExpenseFromDb = (row: any): Expense => ({
  id: row.id,
  organizationId: row.organization_id,
  expenseNumber: row.expense_number,
  vendorName: row.vendor_name,
  vendorEmail: row.vendor_email ?? undefined,
  vendorCompany: row.vendor_company ?? undefined,
  category: row.category ?? undefined,
  items: row.items || [],
  subtotal: row.subtotal ?? 0,
  taxRate: row.tax_rate ?? 0,
  taxAmount: row.tax_amount ?? 0,
  total: row.total ?? 0,
  status: row.status,
  date: row.date,
  dueDate: row.due_date,
  notes: row.notes ?? undefined,
  reference: row.reference ?? undefined,
});

const mapExpenseToDb = (expense: Expense) => ({
  id: expense.id,
  organization_id: expense.organizationId,
  expense_number: expense.expenseNumber,
  vendor_name: expense.vendorName,
  vendor_email: toNullable(expense.vendorEmail),
  vendor_company: toNullable(expense.vendorCompany),
  category: toNullable(expense.category),
  items: expense.items || [],
  subtotal: expense.subtotal,
  tax_rate: expense.taxRate,
  tax_amount: expense.taxAmount,
  total: expense.total,
  status: expense.status,
  date: expense.date,
  due_date: expense.dueDate,
  notes: toNullable(expense.notes),
  reference: toNullable(expense.reference),
});

const mapPaymentToDb = (payment: Payment) => ({
  id: payment.id,
  invoice_id: payment.invoiceId,
  amount: payment.amount,
  date: payment.date,
  method: payment.method,
});

const mapAgentLogFromDb = (row: any): AgentLog => ({
  id: row.id,
  organizationId: row.organization_id ?? undefined,
  timestamp: row.timestamp,
  action: row.action,
  details: row.details,
  relatedId: row.related_id ?? undefined,
  type: row.type,
});

const mapAgentLogToDb = (log: AgentLog) => ({
  id: log.id,
  organization_id: toNullable(log.organizationId),
  timestamp: log.timestamp,
  action: log.action,
  details: log.details,
  related_id: toNullable(log.relatedId),
  type: log.type,
});

export const getCurrentAccountId = () => localStorage.getItem(CURRENT_ACCOUNT_KEY) || '';
export const setCurrentAccountId = (accountId: string) => {
  if (!accountId) return;
  localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
};
export const clearCurrentAccountId = () => {
  localStorage.removeItem(CURRENT_ACCOUNT_KEY);
};
export const getCurrentUserId = () => localStorage.getItem(CURRENT_USER_KEY) || '';
export const setCurrentUserId = (userId: string) => {
  if (!userId) return;
  localStorage.setItem(CURRENT_USER_KEY, userId);
};
export const clearCurrentUserId = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// --- Users ---

export const getUsersByAccount = async (accountId: string): Promise<User[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapUserFromDb);
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return undefined;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', normalizedEmail)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUserFromDb(data) : undefined;
};

export const createUser = async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
  const supabase = getSupabaseClient();
  const newUser: User = {
    ...user,
    email: user.email.trim().toLowerCase(),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('users').insert(mapUserToDb(newUser));
  if (error) throw error;
  return newUser;
};

export const deleteUser = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
  await supabase.from('org_memberships').delete().eq('user_id', id);
};

// --- Organizations ---

export const getOrganizations = async (): Promise<Organization[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOrganizationFromDb);
};

export const getOrganizationsByAccount = async (accountId: string): Promise<Organization[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOrganizationFromDb);
};

export const getAccountById = async (accountId: string): Promise<Account | undefined> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapAccountFromDb(data) : undefined;
};

export const createAccount = async (account: Omit<Account, 'id' | 'createdAt'> & { id?: string }): Promise<Account> => {
  const supabase = getSupabaseClient();
  const newAccount: Account = {
    ...account,
    id: account.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('accounts').insert(mapAccountToDb(newAccount));
  if (error) throw error;
  return newAccount;
};

export const getOrganizationBySlug = async (slug: string): Promise<Organization | undefined> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOrganizationFromDb(data) : undefined;
};

export const createOrganization = async (org: Omit<Organization, 'id' | 'createdAt'>): Promise<Organization> => {
  const supabase = getSupabaseClient();
  const existing = await getOrganizationBySlug(org.slug);
  if (existing) {
    throw new Error('Organization slug already exists');
  }
  if (!org.accountId || !org.ownerId) {
    throw new Error('Account and owner are required to create an organization');
  }
  if (!org.name.trim()) {
    throw new Error('Organization name is required');
  }
  if (!org.slug.trim()) {
    throw new Error('URL Slug is required');
  }
  if (!/^[a-z0-9-]+$/.test(org.slug)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  const now = new Date();
  const bankCountry = resolveCountryCode(org.paymentConfig?.bankCountry, org.address?.country);
  const provider = resolvePayoutProvider(bankCountry || org.paymentConfig?.bankCountry);
  const newOrg: Organization = {
    ...org,
    currency: org.currency || resolveDefaultCurrency(bankCountry, 'USD'),
    primaryColor: org.primaryColor || '#0EA5A4',
    catalogEnabled: org.catalogEnabled ?? false,
    preferredLanguage: org.preferredLanguage || 'English',
    paymentConfig: org.paymentConfig ?? {
      enabled: false,
      provider,
      bankCountry: bankCountry || undefined,
      platformFeePercent: 1.5,
    },
    trial: org.trial ?? buildTrial(now),
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
  };

  const { error } = await supabase.from('organizations').insert(mapOrganizationToDb(newOrg));
  if (error) throw error;

  const membership: OrgMembership = {
    id: crypto.randomUUID(),
    organizationId: newOrg.id,
    userId: newOrg.ownerId,
    role: UserRole.OWNER,
    permissions: ['ALL'],
    createdAt: new Date().toISOString(),
  };
  const { error: membershipError } = await supabase.from('org_memberships').insert(mapMembershipToDb(membership));
  if (membershipError) throw membershipError;

  await createService({
    organizationId: newOrg.id,
    name: 'Consultation Hour',
    description: 'Standard consultation rate per hour.',
    price: 150,
    category: 'Consulting',
    isActive: true,
  });

  return newOrg;
};

export const updateOrganization = async (updatedOrg: Organization): Promise<Organization> => {
  const supabase = getSupabaseClient();
  if (!updatedOrg.name.trim()) {
    throw new Error('Organization name is required');
  }
  if (!updatedOrg.slug.trim()) {
    throw new Error('URL Slug is required');
  }
  if (!/^[a-z0-9-]+$/.test(updatedOrg.slug)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  const { data: conflicts, error: conflictsError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', updatedOrg.slug)
    .neq('id', updatedOrg.id);
  if (conflictsError) throw conflictsError;
  if (conflicts && conflicts.length) {
    throw new Error('Slug already taken');
  }

  const { error } = await supabase
    .from('organizations')
    .update(mapOrganizationToDb(updatedOrg))
    .eq('id', updatedOrg.id);
  if (error) throw error;
  return updatedOrg;
};

// --- Memberships ---

export const getOrgMemberships = async (orgId: string): Promise<OrgMembership[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('org_memberships')
    .select('*')
    .eq('organization_id', orgId);
  if (error) throw error;
  return (data || []).map(mapMembershipFromDb);
};

export const getAccountMemberships = async (accountId: string): Promise<OrgMembership[]> => {
  const orgs = await getOrganizationsByAccount(accountId);
  const orgIds = orgs.map((org) => org.id);
  if (!orgIds.length) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('org_memberships')
    .select('*')
    .in('organization_id', orgIds);
  if (error) throw error;
  return (data || []).map(mapMembershipFromDb);
};

export const upsertOrgMembership = async (membership: Omit<OrgMembership, 'id' | 'createdAt'>): Promise<OrgMembership> => {
  const supabase = getSupabaseClient();
  const { data: existing, error } = await supabase
    .from('org_memberships')
    .select('*')
    .eq('organization_id', membership.organizationId)
    .eq('user_id', membership.userId)
    .maybeSingle();
  if (error) throw error;

  if (existing) {
    const updated: OrgMembership = {
      ...mapMembershipFromDb(existing),
      ...membership,
    };
    const { error: updateError } = await supabase
      .from('org_memberships')
      .update(mapMembershipToDb(updated))
      .eq('id', updated.id);
    if (updateError) throw updateError;
    return updated;
  }

  const newMembership: OrgMembership = {
    ...membership,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const { error: insertError } = await supabase
    .from('org_memberships')
    .insert(mapMembershipToDb(newMembership));
  if (insertError) throw insertError;
  return newMembership;
};

export const removeOrgMembership = async (orgId: string, userId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('org_memberships')
    .delete()
    .eq('organization_id', orgId)
    .eq('user_id', userId);
  if (error) throw error;
};

// --- Services ---

export const getServices = async (orgId: string): Promise<Service[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('organization_id', orgId);
  if (error) throw error;
  return (data || []).map(mapServiceFromDb);
};

export const createService = async (service: Omit<Service, 'id'>): Promise<Service> => {
  const supabase = getSupabaseClient();
  const newService: Service = {
    ...service,
    id: crypto.randomUUID(),
  };
  const { error } = await supabase.from('services').insert(mapServiceToDb(newService));
  if (error) throw error;
  return newService;
};

export const deleteService = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
};

// --- Clients ---

export const getClients = async (orgId: string): Promise<Client[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapClientFromDb);
};

export const createClient = async (client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
  const supabase = getSupabaseClient();
  const newClient: Client = {
    ...client,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('clients').insert(mapClientToDb(newClient));
  if (error) throw error;
  return newClient;
};

export const updateClient = async (updatedClient: Client): Promise<Client> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('clients')
    .update(mapClientToDb(updatedClient))
    .eq('id', updatedClient.id);
  if (error) throw error;
  return updatedClient;
};

export const deleteClient = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
};

// --- Invoices ---

export const getInvoices = async (orgId: string): Promise<Invoice[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', orgId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapInvoiceFromDb);
};

export const createInvoice = async (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<Invoice> => {
  const supabase = getSupabaseClient();
  const { count, error: countError } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', invoice.organizationId);
  if (countError) throw countError;

  const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`;
  const newInvoice: Invoice = {
    ...invoice,
    id: crypto.randomUUID(),
    invoiceNumber,
  };

  const { error } = await supabase.from('invoices').insert(mapInvoiceToDb(newInvoice));
  if (error) throw error;
  return newInvoice;
};

export const updateInvoiceStatus = async (id: string, status: InvoiceStatus): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) throw error;
};

// --- Expenses ---

export const getExpenses = async (orgId: string): Promise<Expense[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('organization_id', orgId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapExpenseFromDb);
};

export const createExpense = async (expense: Omit<Expense, 'id' | 'expenseNumber'>): Promise<Expense> => {
  const supabase = getSupabaseClient();
  const { count, error: countError } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', expense.organizationId);
  if (countError) throw countError;

  const expenseNumber = `EXP-${String((count || 0) + 1).padStart(4, '0')}`;
  const newExpense: Expense = {
    ...expense,
    id: crypto.randomUUID(),
    expenseNumber,
  };

  const { error } = await supabase.from('expenses').insert(mapExpenseToDb(newExpense));
  if (error) throw error;
  return newExpense;
};

export const updateExpense = async (updatedExpense: Expense): Promise<Expense> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('expenses')
    .update(mapExpenseToDb(updatedExpense))
    .eq('id', updatedExpense.id);
  if (error) throw error;
  return updatedExpense;
};

export const updateExpenseStatus = async (id: string, status: ExpenseStatus): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('expenses').update({ status }).eq('id', id);
  if (error) throw error;
};

export const deleteExpense = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
};

// --- Payments ---

export const recordPayment = async (payment: Omit<Payment, 'id'>): Promise<Payment> => {
  const supabase = getSupabaseClient();
  const newPayment: Payment = {
    ...payment,
    id: crypto.randomUUID(),
  };
  const { error } = await supabase.from('payments').insert(mapPaymentToDb(newPayment));
  if (error) throw error;

  await updateInvoiceStatus(payment.invoiceId, InvoiceStatus.PAID);
  return newPayment;
};

// --- Agent Logs ---

export const getAgentLogsByOrg = async (organizationId: string): Promise<AgentLog[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('timestamp', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map(mapAgentLogFromDb);
};

export const createAgentLog = async (
  log: Omit<AgentLog, 'id' | 'timestamp'> & { organizationId: string }
): Promise<AgentLog> => {
  const supabase = getSupabaseClient();
  const newLog: AgentLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const { error } = await supabase.from('agent_logs').insert(mapAgentLogToDb(newLog));
  if (error) throw error;
  return newLog;
};

export const clearAgentLogs = async (organizationId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('agent_logs').delete().eq('organization_id', organizationId);
  if (error) throw error;
};

// --- Legacy Migration ---

export const migrateLegacyLocalStorage = async (): Promise<{ migrated: boolean; counts: Record<string, number> }> => {
  if (localStorage.getItem(LEGACY_MIGRATION_KEY) === 'true') {
    return { migrated: false, counts: {} };
  }

  const legacyAccounts = readLegacyList<Account>(LEGACY_ACCOUNTS_KEY);
  const legacyUsers = readLegacyList<User>(LEGACY_USERS_KEY);
  const legacyOrgs = readLegacyList<Organization>(LEGACY_ORGS_KEY);
  const legacyMemberships = readLegacyList<OrgMembership>(LEGACY_MEMBERSHIPS_KEY);
  const legacyServices = readLegacyList<Service>(LEGACY_SERVICES_KEY);
  const legacyClients = readLegacyList<Client>(LEGACY_CLIENTS_KEY);
  const legacyInvoices = readLegacyList<Invoice>(LEGACY_INVOICES_KEY);
  const legacyExpenses = readLegacyList<Expense>(LEGACY_EXPENSES_KEY);
  const legacyPayments = readLegacyList<Payment>(LEGACY_PAYMENTS_KEY);
  const legacyAgentLogs = readLegacyList<AgentLog>(LEGACY_AGENT_LOGS_KEY);

  const hasLegacyData = [
    legacyAccounts,
    legacyUsers,
    legacyOrgs,
    legacyMemberships,
    legacyServices,
    legacyClients,
    legacyInvoices,
    legacyExpenses,
    legacyPayments,
    legacyAgentLogs,
  ].some((list) => list.length > 0);

  if (!hasLegacyData) {
    return { migrated: false, counts: {} };
  }

  const supabase = getSupabaseClient();
  const upsertRows = async (table: string, rows: any[], onConflict = 'id') => {
    if (!rows.length) return;
    const { error } = await supabase.from(table).upsert(rows, { onConflict });
    if (error) throw error;
  };

  await upsertRows('accounts', legacyAccounts.map(mapAccountToDb));
  await upsertRows('users', legacyUsers.map(mapUserToDb));
  await upsertRows('organizations', legacyOrgs.map(mapOrganizationToDb));
  await upsertRows('org_memberships', legacyMemberships.map(mapMembershipToDb));
  await upsertRows('services', legacyServices.map(mapServiceToDb));
  await upsertRows('clients', legacyClients.map(mapClientToDb));
  await upsertRows('invoices', legacyInvoices.map(mapInvoiceToDb));
  await upsertRows('expenses', legacyExpenses.map(mapExpenseToDb));
  await upsertRows('payments', legacyPayments.map(mapPaymentToDb));

  if (legacyAgentLogs.length) {
    const invoiceOrgMap = new Map(legacyInvoices.map((invoice) => [invoice.id, invoice.organizationId]));
    const fallbackOrgId = legacyOrgs[0]?.id;
    const normalizedLogs = legacyAgentLogs
      .map((log) => ({
        ...log,
        organizationId: log.organizationId || invoiceOrgMap.get(log.relatedId || '') || fallbackOrgId,
      }))
      .filter((log) => log.organizationId);

    await upsertRows('agent_logs', normalizedLogs.map(mapAgentLogToDb));
  }

  localStorage.setItem(LEGACY_MIGRATION_KEY, 'true');

  return {
    migrated: true,
    counts: {
      accounts: legacyAccounts.length,
      users: legacyUsers.length,
      organizations: legacyOrgs.length,
      memberships: legacyMemberships.length,
      services: legacyServices.length,
      clients: legacyClients.length,
      invoices: legacyInvoices.length,
      expenses: legacyExpenses.length,
      payments: legacyPayments.length,
      agentLogs: legacyAgentLogs.length,
    },
  };
};

// --- Seeder ---
export const seedDatabase = async () => {
  const supabase = getSupabaseClient();
  await migrateLegacyLocalStorage();
  const { count, error: countError } = await supabase
    .from('organizations')
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;
  if ((count || 0) > 0) return;

  const ownerUser: User = {
    id: 'user-owner-1',
    accountId: 'account-1',
    name: 'Amina Okoye',
    email: 'amina@acme.inc',
    role: UserRole.OWNER,
    permissions: ['ALL'],
    createdAt: new Date().toISOString(),
  };

  const account: Account = {
    id: 'account-1',
    name: 'Amina Okoye',
    ownerUserId: ownerUser.id,
    contactEmail: ownerUser.email,
    createdAt: new Date().toISOString(),
  };

  const demoOrg: Organization = {
    id: 'demo-org-123',
    accountId: account.id,
    ownerId: ownerUser.id,
    name: 'Acme Digital Services',
    slug: 'acme',
    primaryColor: '#3b82f6',
    currency: 'USD',
    catalogEnabled: true,
    preferredLanguage: 'English',
    contactEmail: 'hello@acme.inc',
    contactPhone: '+1 (555) 123-4567',
    taxId: 'TIN-30294-AC',
    signatoryName: 'Amina Okoye',
    signatoryTitle: 'Founder & Managing Director',
    address: {
      street: '123 Innovation Dr',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'USA',
    },
    paymentConfig: {
      enabled: false,
      provider: 'stripe',
      bankCountry: 'US',
      platformFeePercent: 1.5,
    },
    createdAt: new Date().toISOString(),
  };

  const { error: accountError } = await supabase.from('accounts').insert(mapAccountToDb(account));
  if (accountError) throw accountError;
  const { error: userError } = await supabase.from('users').insert(mapUserToDb(ownerUser));
  if (userError) throw userError;
  const { error: orgError } = await supabase.from('organizations').insert(mapOrganizationToDb(demoOrg));
  if (orgError) throw orgError;

  const { error: membershipError } = await supabase.from('org_memberships').insert(mapMembershipToDb({
    id: 'membership-owner-1',
    organizationId: demoOrg.id,
    userId: ownerUser.id,
    role: UserRole.OWNER,
    permissions: ['ALL'],
    createdAt: new Date().toISOString(),
  }));
  if (membershipError) throw membershipError;

  const demoServices: Service[] = [
    {
      id: 'srv-1',
      organizationId: 'demo-org-123',
      name: 'Web Development',
      description: 'Full stack web development services including frontend, backend, and database integration.',
      price: 1200,
      category: 'Development',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: 'srv-2',
      organizationId: 'demo-org-123',
      name: 'SEO Audit',
      description: 'Complete analysis of your website SEO performance and ranking opportunities.',
      price: 450,
      category: 'Marketing',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: 'srv-3',
      organizationId: 'demo-org-123',
      name: 'UI/UX Design',
      description: 'App interface design, prototyping, and user experience refinement.',
      price: 800,
      category: 'Design',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=800',
    },
  ];
  const { error: serviceError } = await supabase.from('services').insert(demoServices.map(mapServiceToDb));
  if (serviceError) throw serviceError;

  const demoClient: Client = {
    id: 'cli-1',
    organizationId: 'demo-org-123',
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Example Corp',
    phone: '+1 (555) 999-8888',
    address: {
      street: '456 Market St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94103',
      country: 'USA',
    },
    createdAt: new Date().toISOString(),
  };
  const { error: clientError } = await supabase.from('clients').insert(mapClientToDb(demoClient));
  if (clientError) throw clientError;

  const demoExpenses: Expense[] = [
    {
      id: 'exp-1',
      organizationId: 'demo-org-123',
      expenseNumber: 'EXP-0001',
      vendorName: 'NetConnect ISP',
      vendorEmail: 'billing@netconnect.com',
      category: 'Utilities',
      items: [
        { id: 'expi-1', description: 'Business Fiber Internet', quantity: 1, unitCost: 180, total: 180 },
      ],
      subtotal: 180,
      taxRate: 0,
      taxAmount: 0,
      total: 180,
      status: ExpenseStatus.PAID,
      date: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      notes: 'Monthly internet subscription',
    },
    {
      id: 'exp-2',
      organizationId: 'demo-org-123',
      expenseNumber: 'EXP-0002',
      vendorName: 'City Office Supplies',
      category: 'Operations',
      items: [
        { id: 'expi-2', description: 'Printer paper & toner', quantity: 1, unitCost: 95, total: 95 },
      ],
      subtotal: 95,
      taxRate: 0,
      taxAmount: 0,
      total: 95,
      status: ExpenseStatus.SUBMITTED,
      date: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      notes: 'Office consumables',
    },
  ];
  const { error: expenseError } = await supabase.from('expenses').insert(demoExpenses.map(mapExpenseToDb));
  if (expenseError) throw expenseError;

  setCurrentAccountId(account.id);
  setCurrentUserId(ownerUser.id);
};
