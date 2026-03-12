
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN', // Effectively same as Owner for now
  ASSISTANT = 'ASSISTANT',
}

export interface Account {
  id: string;
  name: string;
  ownerUserId: string;
  contactEmail?: string;
  createdAt: string;
}

export interface User {
  id: string;
  accountId: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[]; // 'VIEW_DASHBOARD', 'MANAGE_INVOICES', 'MANAGE_CLIENTS', 'MANAGE_SETTINGS'
  pin?: string; // Simple 4-digit numeric pin for login simulation
  avatarUrl?: string; // Optional avatar
  securityStamp: string; // UUID rotated on password change/revocation to invalidate sessions
  createdAt: string;
}

export interface OrgMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  permissions: string[];
  createdAt: string;
}

export interface TrialInfo {
  startsAt: string;
  endsAt: string;
  accessLevel: 'full';
}

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'yearly';
  startedAt: string;
}

export type InvoiceNumberFormat = 'simple' | 'dated' | 'nitda' | 'custom';

export interface EInvoicingConfig {
  enabled: boolean;
  country?: string;
  invoiceNumberFormat: InvoiceNumberFormat;
  invoiceNumberPrefix: string;
  includeQrCode: boolean;
  qrCodeFields: string[];
  requireClientTin: boolean;
  requireHsnCode: boolean;
  showSellerTin: boolean;
  digitalSignatureEnabled: boolean;
  irnPrefix?: string;
}

export const DEFAULT_EINVOICING_CONFIG: EInvoicingConfig = {
  enabled: false,
  invoiceNumberFormat: 'dated',
  invoiceNumberPrefix: 'INV',
  includeQrCode: true,
  qrCodeFields: ['invoiceNumber', 'date', 'total', 'sellerName'],
  requireClientTin: false,
  requireHsnCode: false,
  showSellerTin: true,
  digitalSignatureEnabled: false,
};

export const NIGERIA_EINVOICING_PRESET: Partial<EInvoicingConfig> = {
  enabled: true,
  country: 'NG',
  invoiceNumberFormat: 'nitda',
  invoiceNumberPrefix: 'INV',
  includeQrCode: true,
  qrCodeFields: ['invoiceNumber', 'date', 'sellerName', 'sellerTin', 'buyerName', 'buyerTin', 'total', 'vatAmount', 'currency'],
  requireClientTin: true,
  requireHsnCode: true,
  showSellerTin: true,
  digitalSignatureEnabled: false,
};

export interface Organization {
  id: string;
  accountId: string;
  ownerId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  currency: string;
  catalogEnabled?: boolean;
  preferredLanguage?: string;
  contactEmail: string;
  contactPhone?: string;
  taxId?: string;
  vatRate?: number;
  signatoryName?: string;
  signatoryTitle?: string;
  parentOrganizationId?: string;
  branchCode?: string;
  shareClientsWithParent?: boolean;
  shareServicesWithParent?: boolean;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paymentConfig?: {
    enabled: boolean;
    provider: 'dusupay' | 'stripe';
    accountId?: string;
    bankName?: string;
    bankCode?: string;
    bankCountry?: string;
    accountName?: string;
    accountNumberLast4?: string;
    mobileNumber?: string;
    mobileNetwork?: string;
    platformFeePercent?: number;
  };
  eInvoicingConfig?: EInvoicingConfig;
  trial?: TrialInfo;
  subscription?: SubscriptionInfo;
  createdAt: string;
}

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  company?: string;
  tin?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  createdAt: string;
}

export interface Service {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isActive: boolean;
  depositRequirement?: number;
  imageUrl?: string;
  hsnCode?: string;
  sacCode?: string;
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface InvoiceItem {
  id: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  hsnCode?: string;
  sacCode?: string;
}

export interface OwnershipTransfer {
  previousClientName: string;
  previousClientEmail: string;
  previousClientCompany?: string;
  previousClientTin?: string;
  previousTotal?: number;
  transferredAt: string;
  reason?: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  clientTin?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  notes?: string;
  ownershipTransfer?: OwnershipTransfer;
  parentInvoiceId?: string;
  rootInvoiceId?: string;
  transferSequence?: number;
}

export interface CartItem extends Service {
  quantity: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: string;
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface ExpenseItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface Expense {
  id: string;
  organizationId: string;
  expenseNumber: string;
  vendorName: string;
  vendorEmail?: string;
  vendorCompany?: string;
  category?: string;
  items: ExpenseItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: ExpenseStatus;
  date: string;
  dueDate: string;
  notes?: string;
  reference?: string;
}

export type ReportPeriod = 'monthly' | 'yearly';

export interface CashFlowBreakdown {
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface ExpenseCategoryTotal {
  category: string;
  total: number;
  count: number;
}

export interface CashFlowReport {
  period: ReportPeriod;
  year: number;
  month?: number;
  currency: string;
  startDate: string;
  endDate: string;
  expenseCategories: ExpenseCategoryTotal[];
  filters?: {
    expenseVendor?: string;
    expenseCategory?: string;
  };
  totals: {
    inflow: number;
    outflow: number;
    net: number;
  };
  counts: {
    invoices: number;
    expenses: number;
  };
  breakdown: CashFlowBreakdown[];
}

export interface AgentLog {
  id: string;
  organizationId?: string;
  timestamp: string;
  action: string;
  details: string;
  relatedId?: string; // e.g. invoice id
  type: 'INFO' | 'WARNING' | 'SUCCESS';
}

export interface InvoiceTransfer {
  id: string;
  fromInvoiceId: string;
  toInvoiceId: string;
  rootInvoiceId: string;
  fromClientName: string;
  fromClientEmail: string;
  fromClientCompany?: string;
  toClientName: string;
  toClientEmail: string;
  toClientCompany?: string;
  originalAmount: number;
  newAmount: number;
  priceDelta: number;
  reason?: string;
  transferredAt: string;
  transferSequence: number;
}

export interface Notification {
  id: string;
  userId: string; // 'admin' or client id
  title: string;
  message: string;
  read: boolean;
  date: string;
  type: 'PAYMENT' | 'OVERDUE' | 'SYSTEM';
}
