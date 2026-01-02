import { Invoice } from '../types';

type SendInvoiceEmailOptions = {
    body?: string;
    orgName?: string;
};

export const sendInvoiceEmail = async (invoice: Invoice, options: SendInvoiceEmailOptions = {}): Promise<void> => {
    const subjectBase = `Invoice ${invoice.invoiceNumber}`;
    const subject = options.orgName ? `${subjectBase} from ${options.orgName}` : subjectBase;

    const response = await fetch('/api/email/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: invoice.clientEmail,
            subject,
            body: options.body,
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.clientName,
        }),
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.error || 'Failed to send invoice email.';
        throw new Error(message);
    }
};
