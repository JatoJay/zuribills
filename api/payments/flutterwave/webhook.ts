import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeStringEqual, ID_REGEX, NUMERIC_REGEX } from '../../_lib/security';

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

const getInvoice = async (invoiceId: string) => {
    if (!ID_REGEX.test(invoiceId)) return null;
    const response = await supabaseFetch(`/invoices?id=eq.${encodeURIComponent(invoiceId)}&select=id,organization_id,total,currency,status,invoice_number&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.[0] || null;
};

const updateInvoiceStatus = async (
    invoiceId: string,
    status: string,
    paymentDetails: Record<string, any>,
    payoutStatus?: 'pending' | 'processing' | 'completed' | 'failed'
) => {
    console.log('Updating invoice status:', { invoiceId, status, payoutStatus });

    const updatePayload: Record<string, any> = {
        status,
        payment_date: new Date().toISOString(),
        payment_method: 'flutterwave',
        payment_reference: paymentDetails.reference,
    };

    if (payoutStatus) {
        updatePayload.payout_status = payoutStatus;
    }

    const response = await supabaseFetch(`/invoices?id=eq.${encodeURIComponent(invoiceId)}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update invoice status:', { invoiceId, status: response.status, error: errorText });
        throw new Error('Failed to update invoice');
    }

    console.log('Invoice status updated successfully:', invoiceId);
};

const updatePayoutStatus = async (invoiceId: string, payoutStatus: string, payoutDetails?: Record<string, any>) => {
    const updatePayload: Record<string, any> = { payout_status: payoutStatus };
    if (payoutDetails?.transferRef) {
        updatePayload.payout_reference = payoutDetails.transferRef;
    }

    await supabaseFetch(`/invoices?id=eq.${encodeURIComponent(invoiceId)}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
    });
};

const verifyTransaction = async (transactionId: string | number) => {
    const id = String(transactionId);
    if (!NUMERIC_REGEX.test(id)) {
        return { status: 'error', message: 'invalid transaction id' };
    }
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${id}/verify`, {
        headers: {
            'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        },
        signal: AbortSignal.timeout(15_000),
    });
    return response.json();
};

const getOrganization = async (orgId: string) => {
    if (!ID_REGEX.test(orgId)) return null;
    const response = await supabaseFetch(`/organizations?id=eq.${encodeURIComponent(orgId)}&select=*`);
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
    const bankCode = paymentConfig.bankCode || paymentConfig.bank_code;
    const accountNumber = paymentConfig.accountNumber || paymentConfig.account_number;
    const accountName = paymentConfig.accountName || paymentConfig.account_name;

    if (!bankCode || !accountNumber) {
        console.log('Incomplete payout details for org:', orgId);
        return { success: false, error: 'Incomplete payout account' };
    }

    const platformFee = (amount * PLATFORM_FEE_PERCENT) / 100;
    const merchantAmount = amount - platformFee;

    const transferRef = `ZB-TRF-${invoiceId}-${Date.now()}`;

    console.log('Initiating transfer:', {
        orgId,
        accountLast4: String(accountNumber).slice(-4),
        amount: merchantAmount,
        currency,
    });

    try {
        const response = await fetch('https://api.flutterwave.com/v3/transfers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FLW_SECRET_KEY}`,
            },
            body: JSON.stringify({
                account_bank: bankCode,
                account_number: accountNumber,
                amount: merchantAmount,
                currency: currency,
                reference: transferRef,
                narration: `ZuriBills payout for invoice ${invoiceId}`,
                debit_currency: currency,
                meta: {
                    invoice_id: invoiceId,
                    original_tx_ref: txRef,
                    platform_fee: platformFee,
                    account_name: accountName,
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
                accountName,
                timestamp: new Date().toISOString(),
            });
            return { success: true, transferRef, merchantAmount };
        } else {
            console.error('Transfer failed');
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
            error: 'Network error',
            invoiceId,
            amount: merchantAmount,
            timestamp: new Date().toISOString(),
        });
        return { success: false, error: 'Transfer failed' };
    }
};

const amountWithinTolerance = (paid: number, expected: number) => {
    return Math.abs(paid - expected) <= 0.01;
};

const processMerchantPayout = async (
    orgId: string,
    amount: number,
    currency: string,
    invoiceId: string,
    txRef: string
) => {
    try {
        await updatePayoutStatus(invoiceId, 'processing');
        const result = await transferToMerchant(orgId, amount, currency, invoiceId, txRef);
        if (result.success) {
            await updatePayoutStatus(invoiceId, 'completed', { transferRef: result.transferRef });
            console.log(`Auto-transfer initiated for invoice ${invoiceId}`);
        } else {
            await updatePayoutStatus(invoiceId, 'failed');
            console.error(`Auto-transfer failed for invoice ${invoiceId}`);
        }
    } catch (err) {
        console.error('Background payout error:', err);
        try {
            await updatePayoutStatus(invoiceId, 'failed');
        } catch {}
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!FLW_WEBHOOK_SECRET) {
        console.error('FLUTTERWAVE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook not configured' });
    }

    if (!FLW_SECRET_KEY) {
        console.error('FLUTTERWAVE_SECRET_KEY not configured');
        return res.status(500).json({ error: 'Webhook not configured' });
    }

    const signature = (req.headers['verif-hash'] as string) || '';

    if (!signature || !timingSafeStringEqual(signature, FLW_WEBHOOK_SECRET)) {
        console.error('Invalid or missing webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log('Flutterwave webhook received:', event.event);

    try {
        if (event.event === 'charge.completed' && event.data?.status === 'successful') {
            const transactionId = event.data.id;
            if (!NUMERIC_REGEX.test(String(transactionId))) {
                console.error('Invalid transaction id format');
                return res.status(200).json({ received: true, error: 'Invalid transaction id' });
            }

            const txRef = String(event.data.tx_ref || '');

            let meta: Record<string, any> = event.data.meta || {};
            if (Array.isArray(meta)) {
                meta = meta.reduce((acc: Record<string, any>, item: any) => {
                    if (item && typeof item === 'object') {
                        Object.assign(acc, item);
                    }
                    return acc;
                }, {});
            }

            let invoiceId = meta.invoice_id;
            if (!invoiceId && txRef.startsWith('ZB-')) {
                const parts = txRef.split('-');
                if (parts.length >= 2) {
                    invoiceId = parts[1];
                }
            }

            if (!invoiceId || typeof invoiceId !== 'string' || !ID_REGEX.test(invoiceId)) {
                console.log('No valid invoice_id, skipping');
                return res.status(200).json({ received: true, skipped: true });
            }

            const [invoice, verification] = await Promise.all([
                getInvoice(invoiceId),
                verifyTransaction(transactionId),
            ]);

            if (!invoice) {
                console.error('Invoice not found:', invoiceId);
                return res.status(200).json({ received: true, error: 'Invoice not found' });
            }

            if (invoice.status === 'PAID') {
                console.log('Invoice already paid, skipping duplicate webhook:', invoiceId);
                return res.status(200).json({ received: true, skipped: true, reason: 'already_paid' });
            }

            if (verification.status !== 'success' || verification.data?.status !== 'successful') {
                console.error('Transaction verification failed');
                return res.status(200).json({ received: true, error: 'Verification failed' });
            }

            const verifiedAmount = Number(verification.data.amount);
            const verifiedCurrency = String(verification.data.currency || '').toUpperCase();
            const expectedTotal = Number(invoice.total);

            if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
                console.error('Invalid verified amount');
                return res.status(200).json({ received: true, error: 'Invalid amount' });
            }

            if (!amountWithinTolerance(verifiedAmount, expectedTotal)) {
                console.error('Amount mismatch:', { verifiedAmount, expectedTotal, invoiceId });
                void logPayout(invoice.organization_id, 'PAYMENT_AMOUNT_MISMATCH', {
                    provider: 'flutterwave',
                    invoiceId,
                    paidAmount: verifiedAmount,
                    expectedTotal,
                    timestamp: new Date().toISOString(),
                });
                return res.status(200).json({ received: true, error: 'Amount mismatch' });
            }

            const orgId = invoice.organization_id;

            await updateInvoiceStatus(invoiceId, 'PAID', {
                reference: txRef,
                transactionId,
                amount: verifiedAmount,
                currency: verifiedCurrency,
            }, 'pending');

            if (orgId) {
                void logPayout(orgId, 'PAYMENT_RECEIVED', {
                    provider: 'flutterwave',
                    reference: txRef,
                    transactionId,
                    invoiceId,
                    invoiceNumber: invoice?.invoice_number,
                    amount: verifiedAmount,
                    currency: verifiedCurrency,
                    timestamp: new Date().toISOString(),
                });

                void processMerchantPayout(orgId, verifiedAmount, verifiedCurrency, invoiceId, txRef);
            }

            console.log(`Payment completed for invoice ${invoiceId}`);
        }

        return res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
}
