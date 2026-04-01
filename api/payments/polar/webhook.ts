import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const verifyWebhookSignature = (payload: string, signature: string, secret: string): boolean => {
    const expectedSignature = createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
};

const supabaseFetch = async (path: string, options: RequestInit = {}) => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        throw new Error('Supabase not configured');
    }
    const url = `${SUPABASE_URL}/rest/v1${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal',
            ...options.headers,
        },
    });
    return response;
};

const logPayout = async (orgId: string, action: string, details: Record<string, any>) => {
    try {
        await supabaseFetch('/agent_logs', {
            method: 'POST',
            body: JSON.stringify({
                id: crypto.randomUUID(),
                organization_id: orgId,
                action,
                details: JSON.stringify(details),
                timestamp: new Date().toISOString(),
            }),
        });
    } catch (error) {
        console.error('Failed to log payout:', error);
    }
};

const getInvoiceByReference = async (reference: string) => {
    const parts = reference.split('-');
    const invoiceId = parts.length >= 2 && parts[0] === 'INV' ? parts[1] : null;
    if (!invoiceId) return null;

    const response = await supabaseFetch(`/invoices?id=eq.${invoiceId}&select=*`);
    if (!response.ok) return null;

    const data = await response.json();
    return data?.[0] || null;
};

const getInvoiceById = async (invoiceId: string) => {
    const response = await supabaseFetch(`/invoices?id=eq.${invoiceId}&select=*`);
    if (!response.ok) return null;

    const data = await response.json();
    return data?.[0] || null;
};

const getOrganization = async (orgId: string) => {
    const response = await supabaseFetch(`/organizations?id=eq.${orgId}&select=*`);
    if (!response.ok) return null;

    const data = await response.json();
    return data?.[0] || null;
};

const updateInvoiceStatus = async (invoiceId: string, status: string, paymentDetails: Record<string, any>) => {
    console.log('Updating invoice status:', { invoiceId, status, reference: paymentDetails.reference });

    const response = await supabaseFetch(`/invoices?id=eq.${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            status,
            payment_date: new Date().toISOString(),
            payment_method: 'polar',
            payment_reference: paymentDetails.reference,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update invoice status:', { invoiceId, status: response.status, error: errorText });
        throw new Error(`Failed to update invoice: ${errorText}`);
    }

    console.log('Invoice status updated successfully:', invoiceId);
};

const createPaymentRecord = async (invoiceId: string, orgId: string, details: Record<string, any>) => {
    await supabaseFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
            id: crypto.randomUUID(),
            invoice_id: invoiceId,
            organization_id: orgId,
            amount: details.amount / 100,
            currency: details.currency?.toUpperCase() || 'USD',
            status: 'completed',
            provider: 'polar',
            reference: details.reference,
            provider_transaction_id: details.checkoutId,
            created_at: new Date().toISOString(),
        }),
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!POLAR_WEBHOOK_SECRET) {
        console.error('POLAR_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook not configured' });
    }

    const signature = req.headers['polar-signature'] as string ||
                      req.headers['x-polar-signature'] as string ||
                      req.headers['webhook-signature'] as string || '';

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (signature && !verifyWebhookSignature(rawBody, signature, POLAR_WEBHOOK_SECRET)) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = event.type || event.event;

    console.log('Polar webhook received:', eventType);

    try {
        switch (eventType) {
            case 'order.paid': {
                const order = event.data;
                const metadata = order.metadata || {};
                const reference = metadata.reference || order.id;
                const invoiceId = metadata.invoice_id;

                if (!invoiceId) {
                    console.log('No invoice_id in metadata, skipping');
                    return res.status(200).json({ received: true, skipped: true });
                }

                const invoice = await getInvoiceById(invoiceId) || await getInvoiceByReference(reference);

                if (invoice?.status === 'PAID') {
                    console.log('Invoice already paid, skipping duplicate webhook:', invoiceId);
                    return res.status(200).json({ received: true, skipped: true, reason: 'already_paid' });
                }

                const orgId = invoice?.organization_id || metadata.organization_id;

                if (!orgId) {
                    console.error('Could not determine organization');
                    return res.status(200).json({ received: true, error: 'No org found' });
                }

                const org = await getOrganization(orgId);

                await updateInvoiceStatus(invoiceId, 'PAID', {
                    reference,
                    amount: order.amount,
                    currency: order.currency,
                });

                await createPaymentRecord(invoiceId, orgId, {
                    reference,
                    amount: order.amount,
                    currency: order.currency,
                    checkoutId: order.checkout_id || order.id,
                });

                await logPayout(orgId, 'PAYOUT_COMPLETED', {
                    provider: 'polar',
                    method: 'auto_transfer',
                    reference,
                    invoiceId,
                    invoiceNumber: invoice?.invoice_number,
                    amount: order.amount / 100,
                    currency: order.currency?.toUpperCase(),
                    bankName: org?.payment_config?.bankName || org?.payment_config?.bank_name,
                    accountName: org?.payment_config?.accountName || org?.payment_config?.account_name,
                    timestamp: new Date().toISOString(),
                });

                console.log(`Payment completed for invoice ${invoiceId}`);
                break;
            }

            case 'checkout.updated': {
                const checkout = event.data;
                if (checkout.status === 'succeeded') {
                    const metadata = checkout.metadata || {};
                    const invoiceId = metadata.invoice_id;

                    if (invoiceId) {
                        await updateInvoiceStatus(invoiceId, 'PAID', {
                            reference: metadata.reference || checkout.id,
                        });
                        console.log(`Checkout succeeded for invoice ${invoiceId}`);
                    }
                }
                break;
            }

            case 'order.refunded': {
                const order = event.data;
                const metadata = order.metadata || {};
                const invoiceId = metadata.invoice_id;

                if (invoiceId) {
                    await updateInvoiceStatus(invoiceId, 'REFUNDED', {
                        reference: metadata.reference || order.id,
                    });

                    const orgId = metadata.organization_id;
                    if (orgId) {
                        await logPayout(orgId, 'PAYOUT_REFUNDED', {
                            provider: 'polar',
                            reference: metadata.reference,
                            invoiceId,
                            amount: order.amount / 100,
                            currency: order.currency?.toUpperCase(),
                            timestamp: new Date().toISOString(),
                        });
                    }
                    console.log(`Refund processed for invoice ${invoiceId}`);
                }
                break;
            }

            case 'checkout.expired': {
                const checkout = event.data;
                const metadata = checkout.metadata || {};
                console.log(`Checkout expired: ${metadata.reference || checkout.id}`);
                break;
            }

            default:
                console.log(`Unhandled event type: ${eventType}`);
        }

        return res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: error.message });
    }
}
