
import { Organization, Service, Invoice, InvoiceStatus, UserRole, Client, Payment } from '../types';

// Keys for LocalStorage
const ORGS_KEY = 'invoiceflow_orgs';
const SERVICES_KEY = 'invoiceflow_services';
const INVOICES_KEY = 'invoiceflow_invoices';
const CLIENTS_KEY = 'invoiceflow_clients';
const PAYMENTS_KEY = 'invoiceflow_payments';

// Helper to simulate delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Organizations ---

export const getOrganizations = (): Organization[] => {
  const data = localStorage.getItem(ORGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getOrganizationBySlug = async (slug: string): Promise<Organization | undefined> => {
  await delay(300);
  const orgs = getOrganizations();
  return orgs.find((o) => o.slug === slug);
};

export const createOrganization = async (org: Omit<Organization, 'id' | 'createdAt'>): Promise<Organization> => {
  await delay(500);
  const orgs = getOrganizations();
  if (orgs.some(o => o.slug === org.slug)) {
    throw new Error('Organization slug already exists');
  }
  
  const newOrg: Organization = {
    ...org,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  
  localStorage.setItem(ORGS_KEY, JSON.stringify([...orgs, newOrg]));
  
  // Seed default services
  await createService({
    organizationId: newOrg.id,
    name: 'Consultation Hour',
    description: 'Standard consultation rate per hour.',
    price: 150,
    category: 'Consulting',
    isActive: true
  });

  return newOrg;
};

export const updateOrganization = async (updatedOrg: Organization): Promise<Organization> => {
  await delay(500);
  const orgs = getOrganizations();
  const index = orgs.findIndex(o => o.id === updatedOrg.id);
  
  if (index === -1) {
    throw new Error('Organization not found');
  }

  // Ensure slug uniqueness if changed (though generally slug shouldn't change often)
  if (orgs.some(o => o.slug === updatedOrg.slug && o.id !== updatedOrg.id)) {
      throw new Error('Slug already taken');
  }

  orgs[index] = updatedOrg;
  localStorage.setItem(ORGS_KEY, JSON.stringify(orgs));
  return updatedOrg;
};

// --- Services ---

export const getServices = async (orgId: string): Promise<Service[]> => {
  await delay(300);
  const data = localStorage.getItem(SERVICES_KEY);
  const services: Service[] = data ? JSON.parse(data) : [];
  return services.filter((s) => s.organizationId === orgId);
};

export const createService = async (service: Omit<Service, 'id'>): Promise<Service> => {
  await delay(300);
  const data = localStorage.getItem(SERVICES_KEY);
  const services: Service[] = data ? JSON.parse(data) : [];
  
  const newService: Service = {
    ...service,
    id: crypto.randomUUID(),
  };
  
  localStorage.setItem(SERVICES_KEY, JSON.stringify([...services, newService]));
  return newService;
};

export const deleteService = async (id: string): Promise<void> => {
    const data = localStorage.getItem(SERVICES_KEY);
    const services: Service[] = data ? JSON.parse(data) : [];
    const filtered = services.filter(s => s.id !== id);
    localStorage.setItem(SERVICES_KEY, JSON.stringify(filtered));
}

// --- Clients ---

export const getClients = async (orgId: string): Promise<Client[]> => {
  await delay(300);
  const data = localStorage.getItem(CLIENTS_KEY);
  const clients: Client[] = data ? JSON.parse(data) : [];
  return clients.filter((c) => c.organizationId === orgId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createClient = async (client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
  await delay(300);
  const data = localStorage.getItem(CLIENTS_KEY);
  const clients: Client[] = data ? JSON.parse(data) : [];
  
  const newClient: Client = {
    ...client,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  
  localStorage.setItem(CLIENTS_KEY, JSON.stringify([...clients, newClient]));
  return newClient;
};

export const updateClient = async (updatedClient: Client): Promise<Client> => {
  await delay(300);
  const data = localStorage.getItem(CLIENTS_KEY);
  const clients: Client[] = data ? JSON.parse(data) : [];
  const index = clients.findIndex(c => c.id === updatedClient.id);
  
  if (index !== -1) {
    clients[index] = updatedClient;
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  }
  return updatedClient;
};

export const deleteClient = async (id: string): Promise<void> => {
    const data = localStorage.getItem(CLIENTS_KEY);
    const clients: Client[] = data ? JSON.parse(data) : [];
    const filtered = clients.filter(c => c.id !== id);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(filtered));
}

// --- Invoices ---

export const getInvoices = async (orgId: string): Promise<Invoice[]> => {
  await delay(300);
  const data = localStorage.getItem(INVOICES_KEY);
  const invoices: Invoice[] = data ? JSON.parse(data) : [];
  return invoices.filter((i) => i.organizationId === orgId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const createInvoice = async (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<Invoice> => {
  await delay(600);
  const data = localStorage.getItem(INVOICES_KEY);
  const invoices: Invoice[] = data ? JSON.parse(data) : [];
  
  // Generate simple invoice number
  const count = invoices.filter(i => i.organizationId === invoice.organizationId).length + 1;
  const invoiceNumber = `INV-${String(count).padStart(4, '0')}`;

  const newInvoice: Invoice = {
    ...invoice,
    id: crypto.randomUUID(),
    invoiceNumber,
  };
  
  localStorage.setItem(INVOICES_KEY, JSON.stringify([...invoices, newInvoice]));
  return newInvoice;
};

export const updateInvoiceStatus = async (id: string, status: InvoiceStatus): Promise<void> => {
    const data = localStorage.getItem(INVOICES_KEY);
    const invoices: Invoice[] = data ? JSON.parse(data) : [];
    const index = invoices.findIndex(i => i.id === id);
    if(index !== -1) {
        invoices[index].status = status;
        localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    }
}

// --- Payments ---

export const recordPayment = async (payment: Omit<Payment, 'id'>): Promise<Payment> => {
    await delay(500);
    const data = localStorage.getItem(PAYMENTS_KEY);
    const payments: Payment[] = data ? JSON.parse(data) : [];
    
    const newPayment: Payment = {
        ...payment,
        id: crypto.randomUUID(),
    };
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify([...payments, newPayment]));

    // Auto-update invoice status
    const invData = localStorage.getItem(INVOICES_KEY);
    const invoices: Invoice[] = invData ? JSON.parse(invData) : [];
    const invoice = invoices.find(i => i.id === payment.invoiceId);
    if (invoice) {
        invoice.status = InvoiceStatus.PAID;
        localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    }

    return newPayment;
}

// --- Seeder ---
export const seedDatabase = () => {
    if (!localStorage.getItem(ORGS_KEY)) {
        const demoOrg: Organization = {
            id: 'demo-org-123',
            name: 'Acme Digital Services',
            slug: 'acme',
            primaryColor: '#3b82f6',
            currency: 'USD',
            contactEmail: 'hello@acme.inc',
            contactPhone: '+1 (555) 123-4567',
            address: {
                street: '123 Innovation Dr',
                city: 'San Francisco',
                state: 'CA',
                zip: '94105',
                country: 'USA'
            },
            paymentConfig: {
                enabled: true,
                provider: 'stripe'
            },
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(ORGS_KEY, JSON.stringify([demoOrg]));

        const demoServices: Service[] = [
            { id: 'srv-1', organizationId: 'demo-org-123', name: 'Web Development', description: 'Full stack web development services.', price: 1200, category: 'Development', isActive: true },
            { id: 'srv-2', organizationId: 'demo-org-123', name: 'SEO Audit', description: 'Complete analysis of your website SEO performance.', price: 450, category: 'Marketing', isActive: true },
            { id: 'srv-3', organizationId: 'demo-org-123', name: 'UI/UX Design', description: 'App interface design and prototyping.', price: 800, category: 'Design', isActive: true },
        ];
        localStorage.setItem(SERVICES_KEY, JSON.stringify(demoServices));
        
        // Seed Client
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
                country: 'USA'
            },
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(CLIENTS_KEY, JSON.stringify([demoClient]));
    }
};