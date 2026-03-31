import { Invoice } from '../types';
import { apiFetch } from './apiClient';

type SendInvoiceEmailOptions = {
    body?: string;
    orgName?: string;
    orgSlug?: string;
};

export const sendInvoiceEmail = async (invoice: Invoice, options: SendInvoiceEmailOptions = {}): Promise<void> => {
    const subjectBase = `Invoice ${invoice.invoiceNumber}`;
    const subject = options.orgName ? `${subjectBase} from ${options.orgName}` : subjectBase;

    const response = await apiFetch('/api/email/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: invoice.clientEmail,
            subject,
            body: options.body,
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.clientName,
            invoiceId: invoice.id,
            orgSlug: options.orgSlug,
        }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.error || 'Failed to send invoice email.';
        throw new Error(message);
    }
};

type SendWelcomeEmailOptions = {
    email: string;
    userName?: string;
    orgName?: string;
    orgSlug?: string;
};

export const sendWelcomeEmail = async (options: SendWelcomeEmailOptions): Promise<void> => {
    const response = await apiFetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: options.email,
            userName: options.userName,
            orgName: options.orgName,
            orgSlug: options.orgSlug,
        }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.error || 'Failed to send welcome email.';
        throw new Error(message);
    }
};
