import type { VercelRequest, VercelResponse } from '@vercel/node';

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

const getInvoice = async (invoiceId: string) => {
    const response = await supabaseFetch(`/invoices?id=eq.${invoiceId}&select=*`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.[0] || null;
};

const updateInvoiceStatus = async (invoiceId: string, status: string, paymentDetails: Record<string, any>) => {
    await supabaseFetch(`/invoices?id=eq.${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            status,
            payment_date: new Date().toISOString(),
            payment_method: 'flutterwave',
            payment_reference: paymentDetails.reference,
        }),
    });
};

const verifyTransaction = async (transactionId: string) => {
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
        headers: {
            'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        },
    });
    return response.json();
};

const getOrganization = async (orgId: string) => {
    const response = await supabaseFetch(`/organizations?id=eq.${orgId}&select=*`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.[0] || null;
};

const PLATFORM_FEE_PERCENT = 0.7;

const transferToMerchant = async (
    orgId: string,
    amount: number,
    currency: string,
    invoiceId: string,
    txRef: string
) => {
    const org = await getOrganization(orgId);
    if (!org?.payment_config) {
        console.log('No payment config for org:', orgId);
        return { success: false, error: 'No payout account configured' };
    }

    const paymentConfig = org.payment_config;
    if (!paymentConfig.bank_code || !paymentConfig.account_number) {
        console.log('Incomplete payout details for org:', orgId);
        return { success: false, error: 'Incomplete payout account' };
    }

    const platformFee = (amount * PLATFORM_FEE_PERCENT) / 100;
    const merchantAmount = amount - platformFee;

    const transferRef = `ZB-TRF-${invoiceId}-${Date.now()}`;

    try {
        const response = await fetch('https://api.flutterwave.com/v3/transfers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FLW_SECRET_KEY}`,
            },
            body: JSON.stringify({
                account_bank: paymentConfig.bank_code,
                account_number: paymentConfig.account_number,
                amount: merchantAmount,
                currency: currency,
                reference: transferRef,
                narration: `ZuriBills payout for invoice ${invoiceId}`,
                meta: {
                    invoice_id: invoiceId,
                    original_tx_ref: txRef,
                    platform_fee: platformFee,
                },
            }),
        });

        const result = await response.json();

        if (result.status === 'success') {
            await logPayout(orgId, 'PAYOUT_INITIATED', {
                provider: 'flutterwave',
                transferRef,
                originalAmount: amount,
                platformFee,
                merchantAmount,
                currency,
                invoiceId,
                bankCode: paymentConfig.bank_code,
                accountName: paymentConfig.account_name,
                timestamp: new Date().toISOString(),
            });
            return { success: true, transferRef, merchantAmount };
        } else {
            console.error('Transfer failed:', result);
            await logPayout(orgId, 'PAYOUT_FAILED', {
                provider: 'flutterwave',
                error: result.message || 'Transfer failed',
                invoiceId,
                amount: merchantAmount,
                timestamp: new Date().toISOString(),
            });
            return { success: false, error: result.message };
        }
    } catch (error: any) {
        console.error('Transfer error:', error);
        await logPayout(orgId, 'PAYOUT_FAILED', {
            provider: 'flutterwave',
            error: error.message,
            invoiceId,
            amount: merchantAmount,
            timestamp: new Date().toISOString(),
        });
        return { success: false, error: error.message };
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const signature = req.headers['verif-hash'] as string || '';

    if (FLW_WEBHOOK_SECRET && signature !== FLW_WEBHOOK_SECRET) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log('Flutterwave webhook received:', event.event);

    try {
        if (event.event === 'charge.completed' && event.data?.status === 'successful') {
            const transactionId = event.data.id;
            const txRef = event.data.tx_ref;
            const meta = event.data.meta || {};
            const invoiceId = meta.invoice_id;

            if (!invoiceId) {
                console.log('No invoice_id in meta, skipping');
                return res.status(200).json({ received: true, skipped: true });
            }

            const verification = await verifyTransaction(transactionId);
            if (verification.status !== 'success' || verification.data?.status !== 'successful') {
                console.error('Transaction verification failed:', verification);
                return res.status(200).json({ received: true, error: 'Verification failed' });
            }

            const invoice = await getInvoice(invoiceId);
            const orgId = invoice?.organization_id;

            await updateInvoiceStatus(invoiceId, 'PAID', {
                reference: txRef,
                transactionId,
                amount: event.data.amount,
                currency: event.data.currency,
            });

            if (orgId) {
                await logPayout(orgId, 'PAYMENT_RECEIVED', {
                    provider: 'flutterwave',
                    reference: txRef,
                    transactionId,
                    invoiceId,
                    invoiceNumber: invoice?.invoice_number,
                    amount: event.data.amount,
                    currency: event.data.currency,
                    timestamp: new Date().toISOString(),
                });

                const transferResult = await transferToMerchant(
                    orgId,
                    event.data.amount,
                    event.data.currency,
                    invoiceId,
                    txRef
                );

                if (transferResult.success) {
                    console.log(`Auto-transfer initiated for invoice ${invoiceId}: ${transferResult.merchantAmount} ${event.data.currency}`);
                } else {
                    console.error(`Auto-transfer failed for invoice ${invoiceId}:`, transferResult.error);
                }
            }

            console.log(`Payment completed for invoice ${invoiceId}`);
        }

        return res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: error.message });
    }
}
