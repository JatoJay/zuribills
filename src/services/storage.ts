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
  InvoiceTransfer,
  EInvoicingConfig,
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
  const parsed = Number.parseInt(import.meta.env.VITE_TRIAL_DAYS || '3', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
})();

const OFFLINE_CACHE_PREFIX = 'invoiceflow_offline_cache_';

const saveToOfflineCache = (key: string, data: any) => {
  try {
    localStorage.setItem(OFFLINE_CACHE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to offline cache', e);
  }
};

const getFromOfflineCache = <T>(key: string): T | null => {
  try {
    const data = localStorage.getItem(OFFLINE_CACHE_PREFIX + key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

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
  securityStamp: row.security_stamp || '',
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
  security_stamp: user.securityStamp,
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
  vatRate: row.vat_rate ?? 0,
  signatoryName: row.signatory_name ?? undefined,
  signatoryTitle: row.signatory_title ?? undefined,
  parentOrganizationId: row.parent_organization_id ?? undefined,
  branchCode: row.branch_code ?? undefined,
  shareClientsWithParent: row.share_clients_with_parent ?? false,
  shareServicesWithParent: row.share_services_with_parent ?? false,
  address: row.address ?? undefined,
  paymentConfig: row.payment_config ?? undefined,
  eInvoicingConfig: row.e_invoicing_config ?? undefined,
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
  vat_rate: org.vatRate ?? 0,
  signatory_name: toNullable(org.signatoryName),
  signatory_title: toNullable(org.signatoryTitle),
  parent_organization_id: toNullable(org.parentOrganizationId),
  branch_code: toNullable(org.branchCode),
  share_clients_with_parent: org.shareClientsWithParent ?? false,
  share_services_with_parent: org.shareServicesWithParent ?? false,
  address: org.address ?? null,
  payment_config: org.paymentConfig ?? null,
  e_invoicing_config: org.eInvoicingConfig ?? null,
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
  hsnCode: row.hsn_code ?? undefined,
  sacCode: row.sac_code ?? undefined,
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
  hsn_code: toNullable(service.hsnCode),
  sac_code: toNullable(service.sacCode),
});

const mapClientFromDb = (row: any): Client => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  email: row.email,
  company: row.company ?? undefined,
  tin: row.tin ?? undefined,
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
  tin: toNullable(client.tin),
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
  clientTin: row.client_tin ?? undefined,
  items: row.items || [],
  subtotal: row.subtotal ?? 0,
  taxRate: row.tax_rate ?? 0,
  taxAmount: row.tax_amount ?? 0,
  total: row.total ?? 0,
  status: row.status,
  date: row.date,
  dueDate: row.due_date,
  notes: row.notes ?? undefined,
  ownershipTransfer: row.ownership_transfer ?? undefined,
  parentInvoiceId: row.parent_invoice_id ?? undefined,
  rootInvoiceId: row.root_invoice_id ?? undefined,
  transferSequence: row.transfer_sequence ?? 0,
});

const mapInvoiceToDb = (invoice: Invoice) => ({
  id: invoice.id,
  organization_id: invoice.organizationId,
  invoice_number: invoice.invoiceNumber,
  client_name: invoice.clientName,
  client_email: invoice.clientEmail,
  client_company: toNullable(invoice.clientCompany),
  client_tin: toNullable(invoice.clientTin),
  items: invoice.items || [],
  subtotal: invoice.subtotal,
  tax_rate: invoice.taxRate,
  tax_amount: invoice.taxAmount,
  total: invoice.total,
  status: invoice.status,
  date: invoice.date,
  due_date: invoice.dueDate,
  notes: toNullable(invoice.notes),
  ownership_transfer: invoice.ownershipTransfer ?? null,
  parent_invoice_id: toNullable(invoice.parentInvoiceId),
  root_invoice_id: toNullable(invoice.rootInvoiceId),
  transfer_sequence: invoice.transferSequence ?? 0,
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

export const getUserById = async (userId: string): Promise<User | undefined> => {
  const normalizedId = userId.trim();
  if (!normalizedId) return undefined;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', normalizedId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUserFromDb(data) : undefined;
};

export const ensureAuthUser = async (payload: {
  id: string;
  accountId: string;
  name: string;
  email: string;
  role?: UserRole;
  permissions?: string[];
  avatarUrl?: string;
}): Promise<User> => {
  const existing = await getUserById(payload.id);
  if (existing) return existing;
  const supabase = getSupabaseClient();
  const newUser: User = {
    id: payload.id,
    accountId: payload.accountId,
    name: payload.name,
    email: payload.email.trim().toLowerCase(),
    role: payload.role ?? UserRole.OWNER,
    permissions: payload.permissions ?? ['ALL'],
    avatarUrl: payload.avatarUrl,
    securityStamp: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('users').upsert(mapUserToDb(newUser), { onConflict: 'id' });
  if (error) throw error;
  return newUser;
};

export const createUser = async (user: Omit<User, 'id' | 'createdAt' | 'securityStamp'>): Promise<User> => {
  const supabase = getSupabaseClient();
  const newUser: User = {
    ...user,
    email: user.email.trim().toLowerCase(),
    id: crypto.randomUUID(),
    securityStamp: crypto.randomUUID(),
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

export const rotateSecurityStamp = async (userId: string): Promise<string> => {
  const supabase = getSupabaseClient();
  const newStamp = crypto.randomUUID();
  const { error } = await supabase
    .from('users')
    .update({ security_stamp: newStamp })
    .eq('id', userId);
  if (error) throw error;
  return newStamp;
};

export const verifySecurityStamp = async (userId: string, stamp: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('security_stamp')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.security_stamp === stamp;
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

export const getOrganizationsForUser = async (userId: string, accountId?: string): Promise<Organization[]> => {
  if (!userId) return [];
  const supabase = getSupabaseClient();
  const { data: memberships, error: membershipError } = await supabase
    .from('org_memberships')
    .select('organization_id')
    .eq('user_id', userId);
  if (membershipError) throw membershipError;
  const orgIds = (memberships || []).map((row) => row.organization_id);
  if (!orgIds.length) return [];

  let query = supabase
    .from('organizations')
    .select('*')
    .in('id', orgIds)
    .order('created_at', { ascending: false });
  if (accountId) {
    query = query.eq('account_id', accountId);
  }
  const { data, error } = await query;
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

export const getBranchesOfOrganization = async (parentOrgId: string): Promise<Organization[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('parent_organization_id', parentOrgId)
    .order('branch_code', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapOrganizationFromDb);
};

export const getOrganizationById = async (orgId: string): Promise<Organization | undefined> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOrganizationFromDb(data) : undefined;
};

export const createAccount = async (account: Omit<Account, 'id' | 'createdAt'> & { id?: string }): Promise<Account> => {
  const supabase = getSupabaseClient();
  const newAccount: Account = {
    ...account,
    id: account.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('accounts').upsert(mapAccountToDb(newAccount), { onConflict: 'id' });
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
  const accountOrgs = org.accountId ? await getOrganizationsByAccount(org.accountId) : [];
  const activeSubscription = accountOrgs.find((existingOrg) => existingOrg.subscription?.status === 'active')?.subscription;
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
      platformFeePercent: 0.7,
    },
    subscription: org.subscription ?? activeSubscription,
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

export const updateAccountSubscription = async (accountId: string, subscription: Organization['subscription']): Promise<void> => {
  if (!accountId || !subscription) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('organizations')
    .update({ subscription })
    .eq('account_id', accountId);
  if (error) throw error;
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

export const getServices = async (orgId: string, includeParent = true): Promise<Service[]> => {
  const cacheKey = `services_${orgId}`;
  try {
    const supabase = getSupabaseClient();
    const orgIds = [orgId];

    if (includeParent) {
      const org = await getOrganizationById(orgId);
      if (org?.shareServicesWithParent && org.parentOrganizationId) {
        orgIds.push(org.parentOrganizationId);
      }
    }

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .in('organization_id', orgIds)
      .order('name', { ascending: true });
    if (error) throw error;
    const results = (data || []).map(mapServiceFromDb);
    saveToOfflineCache(cacheKey, results);
    return results;
  } catch (error) {
    console.warn('Network request failed, attempting to load from offline cache');
    const cached = getFromOfflineCache<Service[]>(cacheKey);
    if (cached) return cached;
    throw error;
  }
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

export const updateService = async (updatedService: Service): Promise<Service> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('services')
    .update(mapServiceToDb(updatedService))
    .eq('id', updatedService.id);
  if (error) throw error;
  return updatedService;
};

export const deleteService = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
};

// --- Clients ---

export const getClients = async (orgId: string, includeParent = true): Promise<Client[]> => {
  const cacheKey = `clients_${orgId}`;
  try {
    const supabase = getSupabaseClient();
    const orgIds = [orgId];

    if (includeParent) {
      const org = await getOrganizationById(orgId);
      if (org?.shareClientsWithParent && org.parentOrganizationId) {
        orgIds.push(org.parentOrganizationId);
      }
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .in('organization_id', orgIds)
      .order('name', { ascending: true });
    if (error) throw error;
    const results = (data || []).map(mapClientFromDb);
    saveToOfflineCache(cacheKey, results);
    return results;
  } catch (error) {
    console.warn('Network request failed, attempting to load from offline cache');
    const cached = getFromOfflineCache<Client[]>(cacheKey);
    if (cached) return cached;
    throw error;
  }
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
  const cacheKey = `invoices_${orgId}`;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', orgId)
      .order('date', { ascending: false });
    if (error) throw error;
    const results = (data || []).map(mapInvoiceFromDb);
    saveToOfflineCache(cacheKey, results);
    return results;
  } catch (error) {
    console.warn('Network request failed, attempting to load from offline cache');
    const cached = getFromOfflineCache<Invoice[]>(cacheKey);
    if (cached) return cached;
    throw error;
  }
};

const generateInvoiceNumber = async (
  organizationId: string,
  config?: EInvoicingConfig
): Promise<string> => {
  const supabase = getSupabaseClient();
  const now = new Date();
  const format = config?.invoiceNumberFormat || 'dated';
  const customPrefix = config?.invoiceNumberPrefix || 'INV';

  let prefix: string;
  let searchPattern: string;

  switch (format) {
    case 'nitda':
      prefix = `${customPrefix}`;
      searchPattern = `${customPrefix}%`;
      break;
    case 'simple':
      prefix = `${customPrefix}-`;
      searchPattern = `${customPrefix}-%`;
      break;
    case 'dated':
    default: {
      const year = now.getFullYear().toString().slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      prefix = `${customPrefix}-${year}${month}-`;
      searchPattern = `${prefix}%`;
      break;
    }
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('organization_id', organizationId)
    .like('invoice_number', searchPattern)
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextSeq = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].invoice_number;
    const match = lastNumber.match(/(\d+)$/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  if (format === 'nitda') {
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

export const createInvoice = async (
  invoice: Omit<Invoice, 'id' | 'invoiceNumber'>,
  eInvoicingConfig?: EInvoicingConfig
): Promise<Invoice> => {
  const supabase = getSupabaseClient();
  const invoiceNumber = await generateInvoiceNumber(invoice.organizationId, eInvoicingConfig);
  const newInvoice: Invoice = {
    ...invoice,
    id: crypto.randomUUID(),
    invoiceNumber,
  };

  const { error } = await supabase.from('invoices').insert(mapInvoiceToDb(newInvoice));
  if (error) throw error;
  return newInvoice;
};

export const updateInvoice = async (invoice: Invoice): Promise<Invoice> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('invoices')
    .update(mapInvoiceToDb(invoice))
    .eq('id', invoice.id);
  if (error) throw error;
  return invoice;
};

export const updateInvoiceStatus = async (id: string, status: InvoiceStatus): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) throw error;
};

const mapInvoiceTransferFromDb = (row: any): InvoiceTransfer => ({
  id: row.id,
  fromInvoiceId: row.from_invoice_id,
  toInvoiceId: row.to_invoice_id,
  rootInvoiceId: row.root_invoice_id,
  fromClientName: row.from_client_name,
  fromClientEmail: row.from_client_email,
  fromClientCompany: row.from_client_company ?? undefined,
  toClientName: row.to_client_name,
  toClientEmail: row.to_client_email,
  toClientCompany: row.to_client_company ?? undefined,
  originalAmount: row.original_amount,
  newAmount: row.new_amount,
  priceDelta: row.price_delta,
  reason: row.reason ?? undefined,
  transferredAt: row.transferred_at,
  transferSequence: row.transfer_sequence,
});

const mapInvoiceTransferToDb = (transfer: InvoiceTransfer) => ({
  id: transfer.id,
  from_invoice_id: transfer.fromInvoiceId,
  to_invoice_id: transfer.toInvoiceId,
  root_invoice_id: transfer.rootInvoiceId,
  from_client_name: transfer.fromClientName,
  from_client_email: transfer.fromClientEmail,
  from_client_company: toNullable(transfer.fromClientCompany),
  to_client_name: transfer.toClientName,
  to_client_email: transfer.toClientEmail,
  to_client_company: toNullable(transfer.toClientCompany),
  original_amount: transfer.originalAmount,
  new_amount: transfer.newAmount,
  price_delta: transfer.priceDelta,
  reason: toNullable(transfer.reason),
  transferred_at: transfer.transferredAt,
  transfer_sequence: transfer.transferSequence,
});

export const transferInvoiceOwnership = async (
  invoiceId: string,
  newClient: { name: string; email: string; company?: string; tin?: string },
  reason?: string,
  newTotal?: number,
  eInvoicingConfig?: EInvoicingConfig
): Promise<{ originalInvoice: Invoice; newInvoice: Invoice; transfer: InvoiceTransfer }> => {
  const supabase = getSupabaseClient();

  const { data: invoiceRow, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!invoiceRow) throw new Error('Invoice not found');

  const originalInvoice = mapInvoiceFromDb(invoiceRow);
  const now = new Date().toISOString();
  const rootInvoiceId = originalInvoice.rootInvoiceId || originalInvoice.id;
  const nextSequence = (originalInvoice.transferSequence ?? 0) + 1;
  const finalTotal = newTotal ?? originalInvoice.total;

  const newInvoiceNumber = await generateInvoiceNumber(originalInvoice.organizationId, eInvoicingConfig);

  const newInvoice: Invoice = {
    id: crypto.randomUUID(),
    organizationId: originalInvoice.organizationId,
    invoiceNumber: newInvoiceNumber,
    clientName: newClient.name,
    clientEmail: newClient.email,
    clientCompany: newClient.company,
    clientTin: newClient.tin,
    items: originalInvoice.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    })),
    subtotal: finalTotal / (1 + (originalInvoice.taxRate || 0) / 100),
    taxRate: originalInvoice.taxRate,
    taxAmount: finalTotal - finalTotal / (1 + (originalInvoice.taxRate || 0) / 100),
    total: finalTotal,
    status: InvoiceStatus.DRAFT,
    date: now,
    dueDate: originalInvoice.dueDate,
    notes: originalInvoice.notes,
    ownershipTransfer: {
      previousClientName: originalInvoice.clientName,
      previousClientEmail: originalInvoice.clientEmail,
      previousClientCompany: originalInvoice.clientCompany,
      previousClientTin: originalInvoice.clientTin,
      previousTotal: originalInvoice.total,
      transferredAt: now,
      reason,
    },
    parentInvoiceId: originalInvoice.id,
    rootInvoiceId,
    transferSequence: nextSequence,
  };

  const { error: insertError } = await supabase.from('invoices').insert(mapInvoiceToDb(newInvoice));
  if (insertError) throw insertError;

  if (!originalInvoice.rootInvoiceId) {
    const { error: updateRootError } = await supabase
      .from('invoices')
      .update({ root_invoice_id: originalInvoice.id })
      .eq('id', originalInvoice.id);
    if (updateRootError) throw updateRootError;
    originalInvoice.rootInvoiceId = originalInvoice.id;
  }

  const transfer: InvoiceTransfer = {
    id: crypto.randomUUID(),
    fromInvoiceId: originalInvoice.id,
    toInvoiceId: newInvoice.id,
    rootInvoiceId,
    fromClientName: originalInvoice.clientName,
    fromClientEmail: originalInvoice.clientEmail,
    fromClientCompany: originalInvoice.clientCompany,
    toClientName: newClient.name,
    toClientEmail: newClient.email,
    toClientCompany: newClient.company,
    originalAmount: originalInvoice.total,
    newAmount: finalTotal,
    priceDelta: finalTotal - originalInvoice.total,
    reason,
    transferredAt: now,
    transferSequence: nextSequence,
  };

  const { error: transferError } = await supabase
    .from('invoice_transfers')
    .insert(mapInvoiceTransferToDb(transfer));
  if (transferError) throw transferError;

  return { originalInvoice, newInvoice, transfer };
};

export const getInvoiceLineage = async (invoiceId: string): Promise<Invoice[]> => {
  const supabase = getSupabaseClient();

  const { data: invoiceRow, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!invoiceRow) return [];

  const invoice = mapInvoiceFromDb(invoiceRow);
  const rootId = invoice.rootInvoiceId || invoice.id;

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .or(`id.eq.${rootId},root_invoice_id.eq.${rootId}`)
    .order('transfer_sequence', { ascending: true });
  if (error) throw error;

  return (data || []).map(mapInvoiceFromDb);
};

export const getInvoiceTransfers = async (rootInvoiceId: string): Promise<InvoiceTransfer[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invoice_transfers')
    .select('*')
    .eq('root_invoice_id', rootInvoiceId)
    .order('transfer_sequence', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapInvoiceTransferFromDb);
};

// --- Expenses ---

export const getExpenses = async (orgId: string): Promise<Expense[]> => {
  const cacheKey = `expenses_${orgId}`;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('organization_id', orgId)
      .order('date', { ascending: false });
    if (error) throw error;
    const results = (data || []).map(mapExpenseFromDb);
    saveToOfflineCache(cacheKey, results);
    return results;
  } catch (error) {
    console.warn('Network request failed, attempting to load from offline cache');
    const cached = getFromOfflineCache<Expense[]>(cacheKey);
    if (cached) return cached;
    throw error;
  }
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
  const { count: orgCount, error: orgCountError } = await supabase
    .from('organizations')
    .select('id', { count: 'exact', head: true });
  if (orgCountError) throw orgCountError;
  if ((orgCount || 0) > 0) return;

  const { count: accountCount, error: accountCountError } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true });
  if (accountCountError) throw accountCountError;
  if ((accountCount || 0) > 0) return;

  const { count: userCount, error: userCountError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });
  if (userCountError) throw userCountError;
  if ((userCount || 0) > 0) return;

  const ownerUser: User = {
    id: 'user-owner-1',
    accountId: 'account-1',
    name: 'Amina Okoye',
    email: 'amina@acme.inc',
    role: UserRole.OWNER,
    permissions: ['ALL'],
    securityStamp: crypto.randomUUID(),
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
      provider: 'polar' as const,
      bankCountry: 'US',
      platformFeePercent: 0.7,
    },
    createdAt: new Date().toISOString(),
  };

  const { error: accountError } = await supabase.from('accounts').insert(mapAccountToDb(account));
  if (accountError) {
    if (accountError.code === '23505') {
      throw new Error('An account with this email already exists. Please sign in instead, or use a different email address.');
    }
    throw accountError;
  }
  const { error: userError } = await supabase.from('users').insert(mapUserToDb(ownerUser));
  if (userError) {
    if (userError.code === '23505') {
      throw new Error('A user with this email already exists. Please sign in instead, or use a different email address.');
    }
    throw userError;
  }
  const { error: orgError } = await supabase.from('organizations').insert(mapOrganizationToDb(demoOrg));
  if (orgError) {
    if (orgError.code === '23505') {
      throw new Error('An organization with this name already exists. Please choose a different name.');
    }
    throw orgError;
  }

  const { error: membershipError } = await supabase.from('org_memberships').insert(mapMembershipToDb({
    id: 'membership-owner-1',
    organizationId: demoOrg.id,
    userId: ownerUser.id,
    role: UserRole.OWNER,
    permissions: ['ALL'],
    createdAt: new Date().toISOString(),
  }));
  if (membershipError) {
    if (membershipError.code === '23505') {
      throw new Error('This membership already exists.');
    }
    throw membershipError;
  }

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
