
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  currency: string;
  contactEmail: string;
  contactPhone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paymentConfig?: {
      enabled: boolean;
      provider: string; // 'stripe' | 'paypal' (mock)
      accountId?: string; // e.g. connected stripe account id
  };
  createdAt: string;
}

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  company?: string;
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
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface InvoiceItem {
  id: string;
  serviceId?: string; // Optional if custom item
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  notes?: string;
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