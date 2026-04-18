import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { timingSafeStringEqual, ID_REGEX } from '../../_lib/security';

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const config = {
    api: {
        bodyParser: false,
    },
};

const readRawBody = async (req: VercelRequest): Promise<string> => {
    return await new Promise((resolve, reject) => {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', (chunk: string) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
};

const verifyWebhookSignature = (payload: string, signature: string, secret: string): boolean => {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const provided = signature.replace(/^sha256=/, '');
    return timingSafeStringEqual(provided, expected);
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
        signal: AbortSignal.timeout(10_000),
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

const getInvoiceById = async (invoiceId: string) => {
    if (!ID_REGEX.test(invoiceId)) return null;
    const response = await supabaseFetch(`/invoices?id=eq.${encodeURIComponent(invoiceId)}&select=*`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.[0] || null;
};

const getOrganization = async (orgId: string) => {
    if (!ID_REGEX.test(orgId)) return null;
    const response = await supabaseFetch(`/organizations?id=eq.${encodeURIComponent(orgId)}&select=*`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.[0] || null;
};

const updateInvoiceStatus = async (invoiceId: string, status: string, paymentDetails: Record<string, any>) => {
    console.log('Updating invoice status:', { invoiceId, status });

    const response = await supabaseFetch(`/invoices?id=eq.${encodeURIComponent(invoiceId)}`, {
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
        throw new Error(`Failed to update invoice`);
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

const amountWithinTolerance = (paidCents: number, expectedAmount: number) => {
    const expectedCents = Math.round(expectedAmount * 100);
    return Math.abs(paidCents - expectedCents) <= 1;
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

    let rawBody: string;
    try {
        rawBody = await readRawBody(req);
    } catch (err) {
        console.error('Failed to read webhook body:', err);
        return res.status(400).json({ error: 'Invalid body' });
    }

    const signature = (req.headers['polar-signature'] as string)
        || (req.headers['x-polar-signature'] as string)
        || (req.headers['webhook-signature'] as string)
        || '';

    if (!signature || !verifyWebhookSignature(rawBody, signature, POLAR_WEBHOOK_SECRET)) {
        console.error('Invalid or missing webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    let event: any;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const eventType = event.type || event.event;

    console.log('Polar webhook received:', eventType);

    try {
        switch (eventType) {
            case 'checkout.created': {
                console.log('Checkout created:', event.data?.id);
                break;
            }

            case 'checkout_session.async_payment_succeeded':
            case 'checkout.completed':
            case 'order.paid': {
                const order = event.data || {};
                const metadata = order.metadata || {};
                const reference = String(metadata.reference || order.id || '');
                const invoiceId = metadata.invoice_id;

                if (!invoiceId || typeof invoiceId !== 'string' || !ID_REGEX.test(invoiceId)) {
                    console.log('No valid invoice_id in metadata, skipping');
                    return res.status(200).json({ received: true, skipped: true });
                }

                const invoice = await getInvoiceById(invoiceId);

                if (!invoice) {
                    console.error('Invoice not found:', invoiceId);
                    return res.status(200).json({ received: true, error: 'Invoice not found' });
                }

                if (invoice.status === 'PAID') {
                    console.log('Invoice already paid, skipping duplicate webhook:', invoiceId);
                    return res.status(200).json({ received: true, skipped: true, reason: 'already_paid' });
                }

                const paidCents = Number(order.amount);
                if (!Number.isFinite(paidCents) || paidCents <= 0) {
                    console.error('Invalid order amount:', order.amount);
                    return res.status(200).json({ received: true, error: 'Invalid amount' });
                }

                if (!amountWithinTolerance(paidCents, Number(invoice.total))) {
                    console.error('Amount mismatch:', { paidCents, invoiceTotal: invoice.total, invoiceId });
                    await logPayout(invoice.organization_id, 'PAYMENT_AMOUNT_MISMATCH', {
                        provider: 'polar',
                        invoiceId,
                        paidCents,
                        expectedTotal: invoice.total,
                        timestamp: new Date().toISOString(),
                    });
                    return res.status(200).json({ received: true, error: 'Amount mismatch' });
                }

                const orgId = invoice.organization_id;

                if (!orgId) {
                    console.error('Could not determine organization');
                    return res.status(200).json({ received: true, error: 'No org found' });
                }

                const [org] = await Promise.all([
                    getOrganization(orgId),
                    updateInvoiceStatus(invoiceId, 'PAID', {
                        reference,
                        amount: order.amount,
                        currency: order.currency,
                    }),
                    createPaymentRecord(invoiceId, orgId, {
                        reference,
                        amount: order.amount,
                        currency: order.currency,
                        checkoutId: order.checkout_id || order.id,
                    }),
                ]);

                void logPayout(orgId, 'PAYOUT_COMPLETED', {
                    provider: 'polar',
                    method: 'auto_transfer',
                    reference,
                    invoiceId,
                    invoiceNumber: invoice?.invoice_number,
                    amount: order.amount / 100,
                    currency: (order.currency || '').toUpperCase(),
                    bankName: org?.payment_config?.bankName || org?.payment_config?.bank_name,
                    accountName: org?.payment_config?.accountName || org?.payment_config?.account_name,
                    timestamp: new Date().toISOString(),
                });

                console.log(`Payment completed for invoice ${invoiceId}`);
                break;
            }

            case 'checkout.updated': {
                const checkout = event.data || {};
                const status = checkout.status;
                console.log('Checkout updated with status:', status);

                if (status === 'succeeded' || status === 'confirmed') {
                    const metadata = checkout.metadata || {};
                    const invoiceId = metadata.invoice_id;

                    if (invoiceId && typeof invoiceId === 'string' && ID_REGEX.test(invoiceId)) {
                        const invoice = await getInvoiceById(invoiceId);
                        if (!invoice) break;
                        if (invoice.status === 'PAID') {
                            console.log('Invoice already paid, skipping:', invoiceId);
                            break;
                        }

                        const paidCents = Number(checkout.amount);
                        if (!amountWithinTolerance(paidCents, Number(invoice.total))) {
                            console.error('checkout.updated amount mismatch:', { paidCents, invoiceTotal: invoice.total });
                            break;
                        }

                        const orgId = invoice.organization_id;

                        if (orgId) {
                            await Promise.all([
                                updateInvoiceStatus(invoiceId, 'PAID', {
                                    reference: metadata.reference || checkout.id,
                                    amount: checkout.amount,
                                    currency: checkout.currency,
                                }),
                                createPaymentRecord(invoiceId, orgId, {
                                    reference: metadata.reference || checkout.id,
                                    amount: checkout.amount,
                                    currency: checkout.currency,
                                    checkoutId: checkout.id,
                                }),
                            ]);
                        } else {
                            await updateInvoiceStatus(invoiceId, 'PAID', {
                                reference: metadata.reference || checkout.id,
                                amount: checkout.amount,
                                currency: checkout.currency,
                            });
                        }

                        console.log(`Checkout succeeded for invoice ${invoiceId}`);
                    }
                }
                break;
            }

            case 'order.refunded': {
                const order = event.data || {};
                const metadata = order.metadata || {};
                const invoiceId = metadata.invoice_id;

                if (invoiceId && typeof invoiceId === 'string' && ID_REGEX.test(invoiceId)) {
                    const [, invoice] = await Promise.all([
                        updateInvoiceStatus(invoiceId, 'REFUNDED', {
                            reference: metadata.reference || order.id,
                        }),
                        getInvoiceById(invoiceId),
                    ]);
                    const orgId = invoice?.organization_id;
                    if (orgId) {
                        void logPayout(orgId, 'PAYOUT_REFUNDED', {
                            provider: 'polar',
                            reference: metadata.reference,
                            invoiceId,
                            amount: Number(order.amount) / 100,
                            currency: (order.currency || '').toUpperCase(),
                            timestamp: new Date().toISOString(),
                        });
                    }
                    console.log(`Refund processed for invoice ${invoiceId}`);
                }
                break;
            }

            case 'checkout.expired': {
                console.log(`Checkout expired:`, event.data?.id);
                break;
            }

            default:
                console.log(`Unhandled event type: ${eventType}`);
        }

        return res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
}
